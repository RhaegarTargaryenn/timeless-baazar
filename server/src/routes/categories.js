import { Router } from 'express';
import { z } from 'zod';

import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';

const router = Router();

const categoryBody = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens only'),
  name: z.string().trim().min(1, 'Name is required'),
  nameHindi: z.string().trim().default(''),
  image: z.string().trim().default(''),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

/**
 * GET /api/categories
 *
 * Public. Returns only active categories unless an admin asks for everything,
 * so a category the client has hidden does not surface on the storefront.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const wantsAll = req.query.all === 'true' && req.isAdmin;
    const filter = wantsAll ? {} : { isActive: true };

    const categories = await Category.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
    res.json({ categories });
  })
);

router.post(
  '/',
  requireAdmin,
  validate(categoryBody),
  asyncHandler(async (req, res) => {
    const existing = await Category.findOne({ slug: req.body.slug });
    if (existing) {
      throw new HttpError(409, `A category with the slug "${req.body.slug}" already exists.`);
    }

    const category = await Category.create(req.body);
    res.status(201).json({ category });
  })
);

router.patch(
  '/:id',
  requireAdmin,
  validate(categoryBody.partial()),
  asyncHandler(async (req, res) => {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!category) throw new HttpError(404, 'Category not found.');

    res.json({ category });
  })
);

/**
 * DELETE /api/categories/:id
 *
 * Refuses while products still point at it. Deleting anyway would leave those
 * products with a dangling reference and drop them out of every listing, with
 * no obvious cause — much worse than an error message telling the client to
 * move the products first.
 */
router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const inUse = await Product.countDocuments({ category: req.params.id });
    if (inUse > 0) {
      throw new HttpError(
        409,
        `${inUse} product${inUse === 1 ? '' : 's'} still use this category. ` +
          'Move them to another category first, or hide this one instead of deleting it.'
      );
    }

    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) throw new HttpError(404, 'Category not found.');

    res.json({ deleted: true });
  })
);

export default router;
