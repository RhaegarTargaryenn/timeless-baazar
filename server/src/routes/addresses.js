import { Router } from 'express';
import { z } from 'zod';

import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';

const router = Router();

const addressBody = z.object({
  label: z.string().trim().default('Home'),
  street: z.string().trim().min(1, 'Address line 1 is required'),
  street2: z.string().trim().default(''),
  village: z.string().trim().default(''),
  city: z.string().trim().min(1, 'City is required'),
  state: z.string().trim().min(1, 'State is required'),
  zipCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  country: z.string().trim().default('India'),
  phone: z
    .string()
    .trim()
    .regex(/^$|^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number')
    .default(''),
  isDefault: z.boolean().default(false),
});

/** Everything here is scoped to req.user.uid — one user can never see another's. */
const getUser = async (uid) => {
  const user = await User.findOneAndUpdate(
    { firebaseUid: uid },
    { $setOnInsert: { firebaseUid: uid } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return user;
};

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = await getUser(req.user.uid);
    res.json({ addresses: user.addresses });
  })
);

router.post(
  '/',
  validate(addressBody),
  asyncHandler(async (req, res) => {
    const user = await getUser(req.user.uid);

    // The first address a customer saves is their default, whatever they ticked.
    const makeDefault = req.body.isDefault || user.addresses.length === 0;

    user.addresses.push({ ...req.body, isDefault: false });
    const created = user.addresses[user.addresses.length - 1];

    if (makeDefault) user.setDefaultAddress(created._id);

    await user.save();
    res.status(201).json({ address: created, addresses: user.addresses });
  })
);

router.patch(
  '/:addressId',
  validate(addressBody.partial(), 'body', { onlyProvided: true }),
  asyncHandler(async (req, res) => {
    const user = await getUser(req.user.uid);
    const address = user.addresses.id(req.params.addressId);
    if (!address) throw new HttpError(404, 'Address not found.');

    const { isDefault, ...fields } = req.body;
    address.set(fields);

    if (isDefault === true) user.setDefaultAddress(address._id);

    await user.save();
    res.json({ address, addresses: user.addresses });
  })
);

/**
 * Making one address the default is a single atomic save.
 *
 * The Firestore version looped over every address issuing a separate write,
 * which could leave two defaults (or none) if it failed halfway.
 */
router.patch(
  '/:addressId/default',
  asyncHandler(async (req, res) => {
    const user = await getUser(req.user.uid);
    if (!user.setDefaultAddress(req.params.addressId)) {
      throw new HttpError(404, 'Address not found.');
    }

    await user.save();
    res.json({ addresses: user.addresses });
  })
);

router.delete(
  '/:addressId',
  asyncHandler(async (req, res) => {
    const user = await getUser(req.user.uid);
    const address = user.addresses.id(req.params.addressId);
    if (!address) throw new HttpError(404, 'Address not found.');

    const wasDefault = address.isDefault;
    address.deleteOne();

    // Never leave the customer with addresses but no default.
    if (wasDefault && user.addresses.length > 0) {
      user.setDefaultAddress(user.addresses[0]._id);
    }

    await user.save();
    res.json({ deleted: true, addresses: user.addresses });
  })
);

export default router;
