import mongoose from 'mongoose';

/**
 * A customer profile keyed by Firebase uid.
 *
 * Identity itself stays in Firebase Auth — this holds only the things Firebase
 * does not: saved addresses, and whatever the shop needs later. There is no
 * password here and no role field: admin rights come from ADMIN_UIDS in the
 * environment, because a role flag in this collection could be flipped by
 * anything that can write to it.
 */
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
    isDefault: { type: Boolean, default: false },
  },
  { _id: true, timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },

    email: { type: String, default: '', lowercase: true, trim: true },
    name: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },

    /**
     * Addresses are embedded rather than a separate collection. They are only
     * ever read as part of one user, they are few, and embedding means setting
     * a new default is a single atomic update instead of the loop of sequential
     * writes the Firestore version used.
     */
    addresses: { type: [addressSchema], default: [] },

    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/** Make exactly one address the default, atomically. */
userSchema.methods.setDefaultAddress = function (addressId) {
  let found = false;
  this.addresses.forEach((address) => {
    const isTarget = String(address._id) === String(addressId);
    address.isDefault = isTarget;
    if (isTarget) found = true;
  });
  return found;
};

export const User = mongoose.model('User', userSchema);
export default User;
