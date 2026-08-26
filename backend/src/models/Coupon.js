import mongoose from 'mongoose';

/**
 * Discount codes the client creates for themselves.
 *
 * SAVE10 was previously hardcoded in Checkout.jsx: the code was readable by
 * anyone who opened devtools, it worked forever, and it could be reused without
 * limit because nothing server-side ever saw it. Validation belongs here.
 */
const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9]{3,20}$/, 'Code must be 3-20 letters or digits'],
    },

    description: { type: String, default: '' },

    type: { type: String, enum: ['percent', 'flat'], required: true },

    /** Percent: 1-100. Flat: an amount in paise. */
    value: { type: Number, required: true, min: 1 },

    /** Order subtotal, in paise, below which the code does not apply. */
    minOrder: { type: Number, default: 0 },

    /**
     * Ceiling on a percentage discount, in paise. Null means no cap.
     * Without this, "20% off" on an unusually large order can cost more than
     * the client intended.
     */
    maxDiscount: { type: Number, default: null },

    /** Total redemptions allowed across all customers. Null means unlimited. */
    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },

    /** Redemptions allowed per customer. */
    perUserLimit: { type: Number, default: 1 },

    startsAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/**
 * Why a coupon cannot be used right now, or null if it can.
 *
 * Returns a reason rather than a boolean so the checkout can tell the customer
 * something useful ("this code needs a ₹500 order") instead of a flat
 * "invalid code", which is what the old hardcoded check gave for every failure.
 */
couponSchema.methods.reasonUnusable = function (subtotal, userUsageCount = 0) {
  const now = new Date();

  if (!this.isActive) return 'This code is no longer active.';
  if (this.startsAt && now < this.startsAt) return 'This code is not active yet.';
  if (this.expiresAt && now > this.expiresAt) return 'This code has expired.';
  if (this.usageLimit !== null && this.usedCount >= this.usageLimit) {
    return 'This code has been fully redeemed.';
  }
  if (this.perUserLimit !== null && userUsageCount >= this.perUserLimit) {
    return 'You have already used this code.';
  }
  if (subtotal < this.minOrder) {
    return `This code needs an order of at least ₹${Math.round(this.minOrder / 100)}.`;
  }
  return null;
};

/** Discount in paise for a given subtotal. Assumes reasonUnusable() passed. */
couponSchema.methods.discountFor = function (subtotal) {
  const raw =
    this.type === 'percent' ? Math.round((subtotal * this.value) / 100) : this.value;

  const capped = this.maxDiscount === null ? raw : Math.min(raw, this.maxDiscount);

  // Never let a discount exceed the order itself.
  return Math.min(capped, subtotal);
};

export const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;
