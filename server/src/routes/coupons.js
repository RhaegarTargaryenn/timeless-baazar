import { Router } from 'express';
import { z } from 'zod';

import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';

const router = Router();

const couponBody = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{3,20}$/, 'Use 3-20 letters or digits'),
  description: z.string().trim().default(''),
  type: z.enum(['percent', 'flat']),
  value: z.number().int().positive(),
  minOrder: z.number().int().min(0).default(0),
  maxDiscount: z.number().int().positive().nullable().default(null),
  usageLimit: z.number().int().positive().nullable().default(null),
  perUserLimit: z.number().int().positive().nullable().default(1),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().nullable().default(null),
  isActive: z.boolean().default(true),
});

const checkPercent = (body) => {
  if (body.type === 'percent' && body.value > 100) {
    throw new HttpError(400, 'A percentage discount cannot be more than 100.');
  }
};

/**
 * POST /api/coupons/validate
 *
 * What checkout calls before showing a discount. Signed-in only, because the
 * per-user limit cannot be enforced without knowing who is asking.
 *
 * This is the check that counts. The old storefront compared the typed code to
 * the string 'SAVE10' in the browser: visible in devtools, valid forever, and
 * reusable as many times as anyone liked.
 */
router.post(
  '/validate',
  requireAuth,
  validate(
    z.object({
      code: z.string().trim().toUpperCase().min(1, 'Enter a code'),
      subtotal: z.number().int().min(0),
    })
  ),
  asyncHandler(async (req, res) => {
    const { code, subtotal } = req.body;

    const coupon = await Coupon.findOne({ code });
    // Same message whether the code is unknown or merely inactive — telling a
    // stranger which codes exist invites guessing.
    if (!coupon) throw new HttpError(404, 'That code is not valid.');

    const usedByThisUser = await Order.countDocuments({
      userId: req.user.uid,
      'coupon.code': code,
      status: { $ne: 'cancelled' },
    });

    const reason = coupon.reasonUnusable(subtotal, usedByThisUser);
    if (reason) throw new HttpError(400, reason);

    res.json({
      coupon: { code: coupon.code, type: coupon.type, value: coupon.value },
      discount: coupon.discountFor(subtotal),
    });
  })
);

// ── Admin ──────────────────────────────────────────────────────────────────

router.get(
  '/',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    res.json({ coupons });
  })
);

router.post(
  '/',
  requireAdmin,
  validate(couponBody),
  asyncHandler(async (req, res) => {
    checkPercent(req.body);

    const existing = await Coupon.findOne({ code: req.body.code }).select('_id').lean();
    if (existing) throw new HttpError(409, `The code ${req.body.code} already exists.`);

    const coupon = await Coupon.create(req.body);
    res.status(201).json({ coupon });
  })
);

router.patch(
  '/:id',
  requireAdmin,
  validate(couponBody.partial()),
  asyncHandler(async (req, res) => {
    if (req.body.type || req.body.value) {
      const current = await Coupon.findById(req.params.id).lean();
      if (!current) throw new HttpError(404, 'Coupon not found.');
      checkPercent({ type: req.body.type ?? current.type, value: req.body.value ?? current.value });
    }

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!coupon) throw new HttpError(404, 'Coupon not found.');

    res.json({ coupon });
  })
);

router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) throw new HttpError(404, 'Coupon not found.');
    res.json({ deleted: true });
  })
);

export default router;
