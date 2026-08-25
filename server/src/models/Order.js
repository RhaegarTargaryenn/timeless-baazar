import mongoose from 'mongoose';

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'packed',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

/**
 * A line in an order.
 *
 * Every customer-visible field is a snapshot taken when the order was placed,
 * not a reference resolved at read time. If the client raises the price of dal
 * next week, last week's order must still show what that customer actually
 * paid. productId and variantId are kept for reporting, but nothing displayed
 * to the customer is read back through them.
 */
const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    variantId: { type: mongoose.Schema.Types.ObjectId },

    name: { type: String, required: true },
    nameHindi: { type: String, default: '' },
    variantLabel: { type: String, required: true },
    image: { type: String, default: '' },

    /** Paise, snapshotted at order time. */
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'Home' },
    street: { type: String, required: true },
    street2: { type: String, default: '' },
    village: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, default: 'India' },
    phone: { type: String, default: '' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    /**
     * Human-readable, and what the customer quotes on the phone.
     *
     * The old format was `TB` + Date.now() + a random number, which produced
     * unreadable 17-digit strings. Generated in the order controller.
     */
    orderNumber: { type: String, required: true, unique: true },

    userId: { type: String, required: true, index: true }, // Firebase uid
    userEmail: { type: String, default: '' },
    userName: { type: String, default: '' },

    items: {
      type: [orderItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'An order needs at least one item',
      },
    },

    address: { type: addressSchema, required: true },

    paymentMethod: { type: String, enum: ['cod'], default: 'cod' },

    // All paise. Totals are computed server-side from the product collection,
    // never trusted from the client — otherwise anyone can post their own price.
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    total: { type: Number, required: true },

    /** Snapshot of the coupon as applied, for the same reason as line items. */
    coupon: {
      code: { type: String, default: null },
      type: { type: String, enum: ['percent', 'flat', null], default: null },
      value: { type: Number, default: null },
    },

    status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },

    statusHistory: [
      {
        status: { type: String, enum: ORDER_STATUSES },
        at: { type: Date, default: Date.now },
        note: { type: String, default: '' },
        _id: false,
      },
    ],

    /**
     * Whether this order made it into the client's Google Sheet.
     *
     * The browser used to post to Apps Script with mode:'no-cors', which cannot
     * read the response — the old code logged "assumed success" and moved on,
     * so a failed write was invisible. Recording the outcome means failures can
     * be found and retried.
     */
    sheetSynced: { type: Boolean, default: false },
    sheetSyncedAt: { type: Date, default: null },
    sheetSyncError: { type: String, default: null },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });

export const Order = mongoose.model('Order', orderSchema);
export default Order;
