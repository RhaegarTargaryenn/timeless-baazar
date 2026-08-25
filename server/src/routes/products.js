import { Router } from 'express';
import { z } from 'zod';

import Product from '../models/Product.js';
import Category from '../models/Category.js';
import { requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';

const router = Router();

/** Prices cross the wire in paise, the same unit they are stored in. */
const variantBody = z.object({
  _id: z.string().optional(),
  label: z.string().trim().min(1, 'Every size needs a label'),
  price: z.number().int().positive('Price must be more than zero'),
  mrp: z.number().int().positive().nullable().default(null),
  isActive: z.boolean().default(true),
});

const productBody = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens only'),
  name: z.string().trim().min(1, 'Name is required'),
  nameHindi: z.string().trim().default(''),
  description: z.string().trim().default(''),
  category: z.string().min(1, 'Pick a category'),
  images: z.array(z.string()).default([]),
  variants: z.array(variantBody).min(1, 'Add at least one size'),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  tags: z.array(z.string()).default([]),
});

const listQuery = z.object({
  category: z.string().optional(),
  search: z.string().trim().optional(),
  // Admin-only; ignored for everyone else.
  all: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

/**
 * Reject an MRP that is not above the selling price.
 *
 * Storing one would render as a struck-through price lower than what the
 * customer pays, or a negative discount — either way it reads as a mistake on
 * the shop's part, so it is worth refusing at the boundary.
 */
const checkMrp = (variants) => {
  const bad = variants.find((v) => v.mrp !== null && v.mrp <= v.price);
  if (bad) {
    throw new HttpError(
      400,
      `"${bad.label}": MRP must be higher than the selling price, or left empty.`
    );
  }
};

/**
 * GET /api/products
 *
 * Public. Hidden products and hidden variants are stripped for everyone except
 * an admin passing ?all=true, so the storefront cannot accidentally show
 * something the client has taken down.
 */
router.get(
  '/',
  validate(listQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { category, search, all, page, limit } = req.valid.query;
    const includeHidden = Boolean(all) && req.isAdmin;

    const filter = includeHidden ? {} : { isActive: true };

    if (category) {
      // Accept a slug, because that is what the storefront's URLs carry.
      const categoryDoc = await Category.findOne({ slug: category }).select('_id').lean();
      if (!categoryDoc) return res.json({ products: [], total: 0, page, limit });
      filter.category = categoryDoc._id;
    }

    if (search) {
      // Regex rather than $text: customers type partial words ("bas" for
      // basmati), and a text index only matches whole terms.
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(safe, 'i');
      filter.$or = [{ name: pattern }, { nameHindi: pattern }, { description: pattern }];
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'slug name nameHindi')
        .sort({ sortOrder: 1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean({ virtuals: true }),
      Product.countDocuments(filter),
    ]);

    const shaped = includeHidden
      ? products
      : products.map((product) => ({
          ...product,
          variants: product.variants.filter((variant) => variant.isActive),
        }));

    res.json({ products: shaped, total, page, limit });
  })
);

/** GET /api/products/:slug — public. Accepts a slug or a Mongo id. */
router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const byId = /^[0-9a-fA-F]{24}$/.test(slug);

    const product = await Product.findOne(byId ? { _id: slug } : { slug })
      .populate('category', 'slug name nameHindi')
      .lean({ virtuals: true });

    if (!product) throw new HttpError(404, 'Product not found.');
    if (!product.isActive && !req.isAdmin) throw new HttpError(404, 'Product not found.');

    if (!req.isAdmin) {
      product.variants = product.variants.filter((variant) => variant.isActive);
    }

    res.json({ product });
  })
);

router.post(
  '/',
  requireAdmin,
  validate(productBody),
  asyncHandler(async (req, res) => {
    checkMrp(req.body.variants);

    const [clash, category] = await Promise.all([
      Product.findOne({ slug: req.body.slug }).select('_id').lean(),
      Category.findById(req.body.category).select('_id').lean(),
    ]);

    if (clash) throw new HttpError(409, `A product with the slug "${req.body.slug}" already exists.`);
    if (!category) throw new HttpError(400, 'That category does not exist.');

    const product = await Product.create(req.body);
    res.status(201).json({ product });
  })
);

router.patch(
  '/:id',
  requireAdmin,
  validate(productBody.partial()),
  asyncHandler(async (req, res) => {
    if (req.body.variants) checkMrp(req.body.variants);

    if (req.body.category) {
      const category = await Category.findById(req.body.category).select('_id').lean();
      if (!category) throw new HttpError(400, 'That category does not exist.');
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('category', 'slug name nameHindi');

    if (!product) throw new HttpError(404, 'Product not found.');

    res.json({ product });
  })
);

/**
 * PATCH /api/products/:id/visibility
 *
 * A dedicated route for the show/hide toggle so the admin panel does not have
 * to send the whole product back — flipping a switch should not risk
 * overwriting a price with whatever the form happened to be holding.
 */
router.patch(
  '/:id/visibility',
  requireAdmin,
  validate(z.object({ isActive: z.boolean() })),
  asyncHandler(async (req, res) => {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: req.body.isActive },
      { new: true }
    ).select('slug name isActive');

    if (!product) throw new HttpError(404, 'Product not found.');
    res.json({ product });
  })
);

router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) throw new HttpError(404, 'Product not found.');
    res.json({ deleted: true });
  })
);

export default router;
