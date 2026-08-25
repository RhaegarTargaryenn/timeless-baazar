import { Router } from 'express';

import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/**
 * GET /api/me
 *
 * Who the caller is, as the server sees them — including whether they are an
 * admin. The frontend cannot work this out on its own: admin rights come from
 * ADMIN_UIDS in the server's environment, deliberately.
 *
 * This only decides what the UI shows. Every write is still checked by
 * requireAdmin, so a tampered response buys nothing but a broken screen.
 */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = await User.findOneAndUpdate(
      { firebaseUid: req.user.uid },
      {
        $set: { lastSeenAt: new Date() },
        $setOnInsert: {
          firebaseUid: req.user.uid,
          email: req.user.email ?? '',
          name: req.user.name ?? '',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    res.json({
      user: {
        uid: req.user.uid,
        email: req.user.email,
        name: profile.name || req.user.name,
        emailVerified: req.user.emailVerified,
        isAdmin: Boolean(req.isAdmin),
        addresses: profile.addresses ?? [],
      },
    });
  })
);

export default router;
