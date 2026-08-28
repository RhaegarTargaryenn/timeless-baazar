import { Router } from 'express';
import { z } from 'zod';

import Order, { ORDER_STATUSES } from '../models/Order.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';
import { syncOrderToSheet } from '../services/sheets.js';

const router = Router();

const addressBody = z.object({
  label: z.string().trim().default('Home'),
  street: z.string().trim().min(1, 'Address is required'),
  street2: z.string().trim().default(''),
  village: z.string().trim().default(''),
  city: z.string().trim().min(1, 'City is required'),
  state: z.string().trim().min(1, 'State is required'),
  zipCode: z.string().trim().min(1, 'Pincode is required'),
  country: z.string().trim().default('India'),
  phone: z.string().trim().default(''),
});

/**
 * Note what the client does NOT send: prices.
 *
 * Only what was chosen and how many. Everything about money is looked up and
 * computed here — a client that can post its own prices can buy a sack of rice
 * for one rupee.
 */
const createOrderBody = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Bad product id'),
        variantId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Bad variant id'),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1, 'Your cart is empty'),
  address: addressBody,
  couponCode: z.string().trim().toUpperCase().nullable().default(null),
  paymentMethod: z.literal('cod').default('cod'),
});

/**
 * Short, readable, and unique enough for a single shop.
 *
 * The old format was 'TB' + Date.now() + a random number, producing 17-digit
 * strings nobody can read back over the phone.
 */

/**
 * DDMM in the shop's own timezone, whatever the server's happens to be.
 *
 * Render runs in UTC. Read off the server clock, every order placed between
 * midnight and 05:30 IST was stamped with the previous day's date -- wrong for
 * a shop in Delhi reading the number back over the phone.
 */
const istStamp = (date) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
  }).formatToParts(date);

  const day = parts.find((part) => part.type === 'day').value;
  const month = parts.find((part) => part.type === 'month').value;

  return `${day}${month}`;
};

/**
 * The next number under today's stamp.
 *
 * Taken from the highest number already issued, not from a count of documents.
 * A count is not a sequence: delete one order and the next one reuses a number
 * that still exists, and the window it counted ran from the *server's* midnight
 * -- so a laptop on IST and Render on UTC disagreed about which orders were
 * "today" and minted `TB-2808-0002` when that order was already in the
 * database. The unique index rejected it and checkout answered 500.
 *
 * The zero-padding is what lets a plain string sort find the highest: within
 * one prefix, `0010` sorts above `0009`.
 */
const makeOrderNumber = async () => {
  const prefix = `TB-${istStamp(new Date())}-`;

  const latest = await Order.findOne({ orderNumber: { $regex: `^${prefix}` } })
    .sort({ orderNumber: -1 })
    .select('orderNumber')
    .lean();

  const sequence = latest ? Number(latest.orderNumber.slice(prefix.length)) + 1 : 1;

  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

/**
 * Create the order, standing back up if the number was taken.
 *
 * Two customers checking out in the same moment both read the same highest
 * number, and the unique index rejects the loser. That is the index doing its
 * job; the loser simply needs the next number, not a failed checkout.
 */
const createOrderWithNumber = async (fields, attempts = 5) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await Order.create({ ...fields, orderNumber: await makeOrderNumber() });
    } catch (error) {
      const numberTaken = error?.code === 11000 && error?.keyPattern?.orderNumber;
      if (!numberTaken || attempt >= attempts) throw error;
    }
  }
};

/**
 * POST /api/orders
 *
 * Prices, availability and the discount are all resolved server-side from the
 * current catalogue. The request only says what and how many.
 */
router.post(
  '/',
  requireAuth,
  validate(createOrderBody),
  asyncHandler(async (req, res) => {
    const { items, address, couponCode, paymentMethod } = req.body;

    if (!req.user.emailVerified) {
      throw new HttpError(403, 'Please verify your email address before ordering.');
    }

    const products = await Product.find({
      _id: { $in: items.map((item) => item.productId) },
    }).populate('category', 'slug name');

    const byId = new Map(products.map((product) => [String(product._id), product]));

    const lineItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = byId.get(item.productId);
      if (!product || !product.isActive) {
        throw new HttpError(409, 'One of the items is no longer available. Please review your cart.');
      }

      const variant = product.variants.id(item.variantId);
      if (!variant || !variant.isActive) {
        throw new HttpError(
          409,
          `"${product.name}" is out of stock in the size you picked. Please review your cart.`
        );
      }

      // Snapshot: what this order shows must not change when prices do.
      lineItems.push({
        productId: product._id,
        variantId: variant._id,
        name: product.name,
        nameHindi: product.nameHindi,
        variantLabel: variant.label,
        image: product.images[0] ?? '',
        price: variant.price,
        quantity: item.quantity,
      });

      subtotal += variant.price * item.quantity;
    }

    let discount = 0;
    let couponSnapshot = { code: null, type: null, value: null };

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode });
      if (!coupon) throw new HttpError(400, 'That code is not valid.');

      const usedByThisUser = await Order.countDocuments({
        userId: req.user.uid,
        'coupon.code': couponCode,
        status: { $ne: 'cancelled' },
      });

      // Re-checked here, not trusted from the earlier /validate call: the cart
      // can change, or the code can run out, between the two requests.
      const reason = coupon.reasonUnusable(subtotal, usedByThisUser);
      if (reason) throw new HttpError(400, reason);

      discount = coupon.discountFor(subtotal);
      couponSnapshot = { code: coupon.code, type: coupon.type, value: coupon.value };

      await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } });
    }

    const deliveryFee = 0; // No delivery charge rules agreed yet.
    const total = subtotal - discount + deliveryFee;

    const order = await createOrderWithNumber({
      userId: req.user.uid,
      userEmail: req.user.email ?? '',
      userName: req.user.name ?? address.label,
      items: lineItems,
      address,
      paymentMethod,
      subtotal,
      discount,
      deliveryFee,
      total,
      coupon: couponSnapshot,
      status: 'pending',
      statusHistory: [{ status: 'pending', at: new Date(), note: 'Order placed' }],
    });

    // The customer should not wait on Google, and a Sheets outage must not
    // fail an order that is already saved. Failures are recorded on the order
    // so they can be found and retried.
    syncOrderToSheet(order).catch((error) => {
      console.error(`[sheets] order ${order.orderNumber} failed:`, error.message);
    });

    res.status(201).json({ order });
  })
);

/** GET /api/orders — the caller's own orders, newest first. */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ userId: req.user.uid })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ orders });
  })
);

/** GET /api/orders/:orderNumber — the caller's own order, or any if admin. */
router.get(
  '/:orderNumber',
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber }).lean();

    // Same 404 for "does not exist" and "belongs to someone else", so order
    // numbers cannot be probed to find out which ones are real.
    if (!order || (order.userId !== req.user.uid && !req.isAdmin)) {
      throw new HttpError(404, 'Order not found.');
    }

    res.json({ order });
  })
);

// ── Admin ──────────────────────────────────────────────────────────────────

router.get(
  '/admin/all',
  requireAdmin,
  validate(
    z.object({
      status: z.enum(ORDER_STATUSES).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
    'query'
  ),
  asyncHandler(async (req, res) => {
    const { status, page, limit } = req.valid.query;
    const filter = status ? { status } : {};

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json({ orders, total, page, limit });
  })
);

router.patch(
  '/:orderNumber/status',
  requireAdmin,
  validate(
    z.object({
      status: z.enum(ORDER_STATUSES),
      note: z.string().trim().default(''),
    })
  ),
  asyncHandler(async (req, res) => {
    const order = await Order.findOneAndUpdate(
      { orderNumber: req.params.orderNumber },
      {
        status: req.body.status,
        $push: { statusHistory: { status: req.body.status, at: new Date(), note: req.body.note } },
      },
      { new: true }
    );

    if (!order) throw new HttpError(404, 'Order not found.');
    res.json({ order });
  })
);

export default router;
