/**
 * Move the hardcoded catalogue into MongoDB.
 *
 *   node src/scripts/seedProducts.js            # dry run, changes nothing
 *   node src/scripts/seedProducts.js --write    # actually write
 *   node src/scripts/seedProducts.js --write --activate-all
 *
 * Idempotent: matches on slug and updates in place, so re-running does not
 * duplicate anything. Prices the client has since edited in the admin panel are
 * NOT overwritten on a re-run — see keepExistingPrices below.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import Category from '../models/Category.js';
import Product from '../models/Product.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const STOREFRONT_DATA = path.resolve(here, '../../../src/data/products.js');

const args = new Set(process.argv.slice(2));
const WRITE = args.has('--write');
const ACTIVATE_ALL = args.has('--activate-all');

/**
 * The storefront file is an ES module full of JSX-free plain data, but it also
 * exports helper functions. Rather than import it (which would drag in its
 * derived `products` export, including the id>=43 price-nulling), parse the raw
 * `baseProducts` array — that is the untouched source data.
 */
const loadBaseProducts = async () => {
  const source = await readFile(STOREFRONT_DATA, 'utf8');

  const start = source.indexOf('const baseProducts = [');
  const end = source.indexOf('\n];', start);
  if (start === -1 || end === -1) {
    throw new Error('Could not find baseProducts in src/data/products.js');
  }

  const literal = source.slice(source.indexOf('[', start), end + 2);
  // The array is plain JSON-ish data with no expressions, so evaluating it is
  // safe here and far less brittle than a regex.
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${literal});`)();
};

const loadCategories = async () => {
  const source = await readFile(STOREFRONT_DATA, 'utf8');
  const start = source.indexOf('export const categories = [');
  const end = source.indexOf('\n];', start);
  const literal = source.slice(source.indexOf('[', start), end + 2);
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${literal});`)();
};

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Rupees in the source file become integer paise in the database. */
const toPaise = (rupees) =>
  Number.isFinite(rupees) && rupees > 0 ? Math.round(rupees * 100) : null;

const run = async () => {
  const [baseProducts, sourceCategories] = await Promise.all([
    loadBaseProducts(),
    loadCategories(),
  ]);

  console.log(`Parsed ${baseProducts.length} products, ${sourceCategories.length} categories\n`);

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

  // ── Categories ───────────────────────────────────────────────────────────
  // "all" in the source file is a UI filter chip, not a real category.
  const realCategories = sourceCategories.filter((c) => c.id !== 'all');
  const categoryIdBySlug = new Map();

  for (const [index, category] of realCategories.entries()) {
    const doc = {
      slug: category.id,
      name: category.name,
      nameHindi: category.nameHindi ?? '',
      image: category.image ?? '',
      sortOrder: index,
      isActive: true,
    };

    if (WRITE) {
      const saved = await Category.findOneAndUpdate({ slug: doc.slug }, doc, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      });
      categoryIdBySlug.set(doc.slug, saved._id);
    }
    console.log(`  category  ${doc.slug.padEnd(10)} ${doc.name}`);
  }

  // ── Products ─────────────────────────────────────────────────────────────
  console.log('');
  const seenSlugs = new Set();
  let created = 0;
  let updated = 0;
  let skippedPrices = 0;

  for (const product of baseProducts) {
    let slug = slugify(product.name);
    // Two source products can slugify to the same string; keep them distinct.
    if (seenSlugs.has(slug)) slug = `${slug}-${product.id}`;
    seenSlugs.add(slug);

    const price1kg = toPaise(product.price1kg);
    const price500g = toPaise(product.price500g);

    const variants = [];
    if (price500g) variants.push({ label: '500 g', price: price500g, mrp: null, isActive: true });
    if (price1kg) variants.push({ label: '1 kg', price: price1kg, mrp: null, isActive: true });

    if (variants.length === 0) {
      console.log(`  ⚠ skipped  ${product.name} — no usable price`);
      continue;
    }

    /**
     * The 29 products from id 43 onward were force-hidden in the storefront.
     * Their prices are real, but nobody has confirmed them for sale, so they
     * are seeded inactive unless --activate-all is passed. The client can flip
     * each one on from the admin panel.
     */
    const isActive = ACTIVATE_ALL ? true : product.id < 43;

    const categoryId = categoryIdBySlug.get(product.category);
    if (WRITE && !categoryId) {
      throw new Error(`Product "${product.name}" has unknown category "${product.category}"`);
    }

    if (!WRITE) {
      console.log(
        `  product   ${slug.padEnd(34)} ${variants.length} variants  ${isActive ? '' : '(inactive)'}`
      );
      continue;
    }

    const existing = await Product.findOne({ slug });

    /**
     * On a re-run, do not clobber prices or availability the client has since
     * changed in the admin panel — the file this script reads is a frozen
     * snapshot and would silently roll their edits back.
     */
    const keepExistingPrices = Boolean(existing);

    await Product.findOneAndUpdate(
      { slug },
      {
        slug,
        legacyId: product.id,
        name: product.name,
        nameHindi: product.nameHindi ?? '',
        description: product.description ?? '',
        category: categoryId,
        images: product.image ? [product.image] : [],
        sortOrder: product.id,
        ...(keepExistingPrices ? {} : { variants, isActive }),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (existing) {
      updated += 1;
      skippedPrices += 1;
    } else {
      created += 1;
    }
  }

  console.log('');
  if (WRITE) {
    console.log(`✓ ${created} created, ${updated} updated`);
    if (skippedPrices) {
      console.log(`  (${skippedPrices} already existed — prices and availability left alone)`);
    }
    const active = await Product.countDocuments({ isActive: true });
    const total = await Product.countDocuments();
    console.log(`  ${active}/${total} products active`);
  } else {
    console.log('Dry run — nothing written. Re-run with --write to apply.');
    if (!ACTIVATE_ALL) {
      console.log('Products with id >= 43 would be seeded INACTIVE (--activate-all to override).');
    }
  }

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(`\n✗ ${error.message}\n`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
