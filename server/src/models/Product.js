import mongoose from 'mongoose';

/**
 * One purchasable size of a product.
 *
 * Kept as a subdocument rather than a separate product so the storefront shows
 * a single card with a size selector, and so renaming a product or swapping its
 * photo is one edit instead of one per size.
 */
const variantSchema = new mongoose.Schema(
  {
    /** What the customer sees: "500 g", "1 kg", "5 kg pack". */
    label: { type: String, required: true, trim: true },

    /**
     * Money is stored in paise, as an integer.
     *
     * Rupees-as-float quietly corrupts arithmetic: 132.50 * 3 evaluates to
     * 397.50000000000006 in JavaScript. Rounding on display hides it, but the
     * value written to an order document does not get rounded. The admin panel
     * takes and shows rupees; conversion happens at the edge.
     */
    price: {
      type: Number,
      required: true,
      min: [1, 'Price must be at least 1 paisa'],
      validate: {
        validator: Number.isInteger,
        message: 'Price must be an integer number of paise, not rupees',
      },
    },

    /**
     * Optional list price, also in paise.
     *
     * Null by default and deliberately so. The old storefront invented an MRP
     * by computing price / 0.8 and slapping a "20% off" badge on every single
     * product. No badge is shown unless a real MRP is entered here.
     */
    mrp: {
      type: Number,
      default: null,
      validate: {
        validator(value) {
          if (value === null || value === undefined) return true;
          return Number.isInteger(value) && value > 0;
        },
        message: 'MRP must be an integer number of paise',
      },
    },

    /** The client's out-of-stock toggle. No quantity counting. */
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

variantSchema.virtual('discountPercent').get(function () {
  if (!this.mrp || this.mrp <= this.price) return 0;
  return Math.round(((this.mrp - this.price) / this.mrp) * 100);
});

const productSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers and hyphens'],
    },

    /**
     * The numeric id these products had while they lived in
     * src/data/products.js. Carts already saved in customers' browsers, and
     * every order in Firestore, reference these — keeping the mapping means
     * old data stays traceable.
     */
    legacyId: { type: Number, default: null, index: true },

    name: { type: String, required: true, trim: true },
    nameHindi: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },

    /** First image is the primary one shown on the card. */
    images: {
      type: [String],
      default: [],
    },

    variants: {
      type: [variantSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'A product needs at least one variant',
      },
    },

    /**
     * The client's show/hide switch. Replaces the `id >= 43` rule that was
     * hardcoded in three files and force-nulled the prices of 29 products.
     */
    isActive: { type: Boolean, default: true },

    sortOrder: { type: Number, default: 0 },

    /** Free-form badges for the storefront: "bestseller", "new". */
    tags: { type: [String], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/** True when at least one variant is actually buyable. */
productSchema.virtual('isPurchasable').get(function () {
  return this.isActive && this.variants.some((variant) => variant.isActive);
});

// The storefront's default query: active products in a category, in order.
productSchema.index({ isActive: 1, category: 1, sortOrder: 1 });

// Search covers the Hindi name too — customers do search "दाल".
productSchema.index({ name: 'text', nameHindi: 'text', description: 'text' });

export const Product = mongoose.model('Product', productSchema);
export default Product;
