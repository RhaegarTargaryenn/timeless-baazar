import mongoose from 'mongoose';

/**
 * Categories live in their own collection rather than a hardcoded enum.
 *
 * Adding "Oil" or "Dry Fruits" should never mean a code change and a redeploy —
 * that is the exact problem this whole rebuild exists to remove.
 */
const categorySchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      // The storefront routes on this (/products?category=daal), so it must
      // stay URL-safe.
      match: [/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers and hyphens'],
    },

    name: { type: String, required: true, trim: true },
    nameHindi: { type: String, default: '', trim: true },

    image: { type: String, default: '' },

    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

categorySchema.index({ isActive: 1, sortOrder: 1 });

export const Category = mongoose.model('Category', categorySchema);
export default Category;
