/**
 * Point every category at its cut-out PNG.
 *
 * The seeded category images were JPEGs of an illustration on a flat white
 * field, which reads as a grey box inside the Explore grid's coloured tiles.
 * `public/category/*.png` holds the same artwork with that field keyed to
 * transparency; this swaps the stored paths over.
 *
 * Idempotent: running it twice changes nothing.
 */
import { connectDatabase } from '../config/db.js';
import Category from '../models/Category.js';
import mongoose from 'mongoose';

const run = async () => {
  await connectDatabase();

  const categories = await Category.find({ image: /\.jpg$/i });
  for (const category of categories) {
    category.image = category.image.replace(/\.jpg$/i, '.png');
    await category.save();
    console.log(`  ${category.slug.padEnd(10)} -> ${category.image}`);
  }

  console.log(`${categories.length} categor${categories.length === 1 ? 'y' : 'ies'} updated.`);
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
