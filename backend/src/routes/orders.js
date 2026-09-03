import { Router } from 'express';
import { z } from 'zod';

import Order, { ORDER_STATUSES } from '../models/Order.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';
import { syncOrderToSheet, syncOrderStatusToSheet } from '../services/sheets.js';

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

      /*
        A cancelled order does not count against the customer's uses.

        This is the real reason cancellation had to exist. Without it, the shop
        voiding a mistaken order by marking it "completed" would silently burn
        the one use that customer had of the coupon -- they would be told the
        code was already used, for an order that never happened.

        The same count lives in routes/coupons.js; the two must stay in step.
      */
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
      status: 'placed',
      statusHistory: [{ status: 'placed', at: new Date(), note: 'Order placed' }],
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

    /**
     * Counts come back with the page, for every status, not just the one being
     * viewed.
     *
     * The admin screen's filter pills each carry a number. Deriving those from
     * the returned page would be wrong the moment there is more than one page:
     * the pills would count the fifty orders on screen rather than the whole
     * book. One grouped count over the collection is cheap and always right.
     */
    const [orders, total, grouped] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
      Order.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    ]);

    // Always every status, so a pill that happens to have no orders still
    // renders as "0" rather than vanishing from the row.
    const counts = Object.fromEntries(ORDER_STATUSES.map((value) => [value, 0]));
    let all = 0;
    for (const row of grouped) {
      if (row._id in counts) counts[row._id] = row.n;
      all += row.n;
    }

    res.json({ orders, total, page, limit, counts: { ...counts, all } });
  })
);

/**
 * GET /api/orders/admin/stats — what the shop's dashboard draws.
 *
 * Computed in MongoDB rather than in the browser, and that is the whole reason
 * this route exists: `/admin/all` caps `limit` at 100, so a dashboard adding up
 * rows on the client would silently describe **the most recent hundred orders**
 * and call it the year. It would also grow slower every month for a number that
 * an aggregation returns in one round trip.
 *
 * **Cancelled orders are excluded from every money figure.** They are orders
 * that never happened; counting their rupees would overstate the shop's takings
 * and make the totals disagree with the sheet. They are still counted in the
 * status breakdown, because "how many did we void" is a real question.
 *
 * **Every day boundary is Asia/Kolkata**, not the server's. Render runs in UTC,
 * so grouping on the server clock puts every order placed between midnight and
 * 05:30 IST on the previous day -- the same bug this file's order numbering was
 * fixed for once already.
 */
const IST = 'Asia/Kolkata';

router.get(
  '/admin/stats',
  requireAdmin,
  validate(
    z.object({
      // How much history the chart draws. Bounded so a stray ?days=100000
      // cannot ask Mongo to build a hundred thousand buckets.
      days: z.coerce.number().int().min(7).max(365).default(30),
    }),
    'query'
  ),
  asyncHandler(async (req, res) => {
    const { days } = req.valid.query;

    // Midnight IST, `days` ago. Built from the IST calendar date rather than by
    // subtracting milliseconds from now, so the window starts at the beginning
    // of a day the shop would recognise instead of at whatever time it is.
    const startOfToday = new Date(
      new Date().toLocaleString('en-US', { timeZone: IST })
    );
    startOfToday.setHours(0, 0, 0, 0);

    const since = new Date(startOfToday);
    since.setDate(since.getDate() - (days - 1));

    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 6);

    const startOfMonth = new Date(startOfToday);
    startOfMonth.setDate(1);

    const earns = { status: { $ne: 'cancelled' } };

    const sumOver = (from) => [
      { $match: { ...earns, createdAt: { $gte: from } } },
      { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
    ];

    const [
      today,
      week,
      month,
      allTime,
      statusRows,
      seriesRows,
      topRows,
      catalogue,
    ] = await Promise.all([
      Order.aggregate(sumOver(startOfToday)),
      Order.aggregate(sumOver(startOfWeek)),
      Order.aggregate(sumOver(startOfMonth)),
      Order.aggregate([
        { $match: earns },
        { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
      ]),

      Order.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),

      // One bucket per calendar day, in the shop's own timezone.
      Order.aggregate([
        { $match: { ...earns, createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: IST } },
            orders: { $sum: 1 },
            revenue: { $sum: '$total' },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      /*
        Best sellers, by quantity actually sold.

        Grouped on the snapshotted name rather than productId: a product that
        was renamed or deleted still has to appear, and the order's own snapshot
        is the only record of what the customer bought.
      */
      Order.aggregate([
        { $match: { ...earns, createdAt: { $gte: since } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.name',
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        { $sort: { quantity: -1 } },
        { $limit: 5 },
      ]),

      Product.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            live: { $sum: { $cond: ['$isActive', 1, 0] } },
          },
        },
      ]),
    ]);

    const totals = (rows) => ({
      orders: rows[0]?.orders ?? 0,
      revenue: rows[0]?.revenue ?? 0,
    });

    const statuses = Object.fromEntries(ORDER_STATUSES.map((value) => [value, 0]));
    for (const row of statusRows) {
      if (row._id in statuses) statuses[row._id] = row.n;
    }

    /*
      Days with no orders are filled in as zero.

      Mongo returns only the days that have documents, and a line chart fed a
      gappy series draws a straight line across a quiet week as though trade
      continued through it.
    */
    const byDay = new Map(seriesRows.map((row) => [row._id, row]));
    const series = [];
    for (let index = 0; index < days; index += 1) {
      const day = new Date(since);
      day.setDate(day.getDate() + index);

      const key = new Intl.DateTimeFormat('en-CA', {
        timeZone: IST,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(day);

      const row = byDay.get(key);
      series.push({ date: key, orders: row?.orders ?? 0, revenue: row?.revenue ?? 0 });
    }

    const lifetime = totals(allTime);

    res.json({
      stats: {
        days,
        today: totals(today),
        week: totals(week),
        month: totals(month),
        allTime: lifetime,

        // Rounded to whole paise: an average is for reading, and the sub-paise
        // tail is noise the UI would have to trim anyway.
        averageOrderValue: lifetime.orders
          ? Math.round(lifetime.revenue / lifetime.orders)
          : 0,

        statuses,
        series,
        topProducts: topRows.map((row) => ({
          name: row._id,
          quantity: row.quantity,
          revenue: row.revenue,
        })),
        catalogue: {
          total: catalogue[0]?.total ?? 0,
          live: catalogue[0]?.live ?? 0,
          hidden: (catalogue[0]?.total ?? 0) - (catalogue[0]?.live ?? 0),
        },
      },
    });
  })
);

/**
 * PATCH /api/orders/:orderNumber/status — move an order between the two states.
 *
 * Both directions are allowed on purpose. Completing is one tap and the client
 * will be doing it with one hand at a counter, so mis-taps are a question of
 * when, not whether; making it one-way would mean the only fix for a slip is a
 * database edit. The history keeps the record either way.
 *
 * `cancelled` is reachable the same way, and is reversible for the same reason:
 * a cancel tapped by mistake must not need a database edit to undo. Reopening a
 * cancelled order puts it back to `placed`, and because the coupon count
 * excludes cancelled orders, that also correctly gives the customer their
 * coupon use back.
 */
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
    const { status, note } = req.valid.body;

    const order = await Order.findOneAndUpdate(
      { orderNumber: req.params.orderNumber },
      {
        status,
        // `$push`, not a replace: the trail is the only record of who moved
        // this order and when, and the customer's screen reads its timestamps.
        $push: { statusHistory: { status, at: new Date(), note } },
      },
      { new: true }
    );

    if (!order) throw new HttpError(404, 'Order not found.');

    /*
      The shop still reads orders off their Google Sheet, so an order they just
      completed or cancelled must not go on showing as `placed` there. The sheet
      is a mirror of this database, never the other way round.

      Fire-and-forget, exactly like the sync at order creation: the client is
      standing at a counter with a customer in front of them, and neither a slow
      Apps Script nor a Google outage may make "Mark done" hang or fail. The
      status is already committed above; a failed push is recorded on the order
      as `sheetStatusSyncError`, and the next change to this order re-posts the
      whole row anyway.
    */
    syncOrderStatusToSheet(order).catch((error) => {
      console.error(
        `[sheets] status ${order.orderNumber} -> ${status} failed:`,
        error.message
      );
    });

    res.json({ order });
  })
);

export default router;
