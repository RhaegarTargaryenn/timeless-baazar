/**
 * End-to-end check of the API with a real Firebase token.
 *
 *   node src/scripts/smokeTest.js
 *
 * Mints a custom token for ADMIN_UIDS[0] with the Admin SDK, exchanges it for a
 * real ID token through Firebase's REST endpoint, then drives the admin routes.
 * That exercises the whole chain the admin panel will use — token verification,
 * the uid check, validation, and the handlers — rather than mocking any of it.
 *
 * Everything it creates is cleaned up at the end.
 */
import 'dotenv/config';
import { firebaseAuth } from '../config/firebase.js';
import config from '../config/env.js';

const BASE = `http://localhost:${config.port}/api`;
const WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY;

let passed = 0;
let failed = 0;

const check = (label, condition, detail = '') => {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${label}${detail ? `  — ${detail}` : ''}`);
  }
};

const api = async (path, { token, ...options } = {}) => {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, body };
};

/**
 * A custom token is not an ID token — the API only accepts the latter, so it
 * has to be exchanged the same way a browser would.
 */
const getIdToken = async (uid) => {
  const customToken = await firebaseAuth.createCustomToken(uid);

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${WEB_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Token exchange failed: ${data.error?.message ?? response.status}`);
  }
  return data.idToken;
};

const run = async () => {
  const adminUid = config.adminUids[0];
  if (!adminUid) throw new Error('ADMIN_UIDS is empty in server/.env');
  if (!WEB_API_KEY) {
    throw new Error(
      'FIREBASE_WEB_API_KEY is not set in server/.env.\n' +
        '  It is the same public apiKey the frontend uses (see the root .env,\n' +
        '  VITE_FIREBASE_API_KEY). Only this smoke test needs it.'
    );
  }

  console.log(`Signing in as admin ${adminUid}\n`);
  const token = await getIdToken(adminUid);

  // ── Admin can see what the public cannot ─────────────────────────────────
  console.log('Admin visibility');
  const publicList = await api('/products?limit=100');
  const adminList = await api('/products?limit=100&all=true', { token });
  check('public sees only active products', publicList.body.total === 42, `got ${publicList.body.total}`);
  check('admin sees every product', adminList.body.total === 71, `got ${adminList.body.total}`);

  const hidden = await api('/products/turmeric-powder');
  const hiddenAsAdmin = await api('/products/turmeric-powder', { token });
  check('hidden product is 404 for public', hidden.status === 404);
  check('hidden product is visible to admin', hiddenAsAdmin.status === 200);

  // ── Product write path ───────────────────────────────────────────────────
  console.log('\nProduct writes');
  const created = await api('/products', {
    token,
    method: 'POST',
    body: {
      slug: 'smoke-test-product',
      name: 'Smoke Test Product',
      category: adminList.body.products[0].category._id,
      variants: [{ label: '1 kg', price: 9900, mrp: 12900, isActive: true }],
    },
  });
  check('admin can create a product', created.status === 201, JSON.stringify(created.body).slice(0, 120));

  const productId = created.body.product?._id;

  const badMrp = await api('/products', {
    token,
    method: 'POST',
    body: {
      slug: 'smoke-bad-mrp',
      name: 'Bad MRP',
      category: adminList.body.products[0].category._id,
      variants: [{ label: '1 kg', price: 9900, mrp: 5000, isActive: true }],
    },
  });
  check('MRP below selling price is rejected', badMrp.status === 400, `got ${badMrp.status}`);

  const badPrice = await api('/products', {
    token,
    method: 'POST',
    body: {
      slug: 'smoke-bad-price',
      name: 'Bad Price',
      category: adminList.body.products[0].category._id,
      variants: [{ label: '1 kg', price: -5, isActive: true }],
    },
  });
  check('negative price is rejected', badPrice.status === 400, `got ${badPrice.status}`);

  const duplicate = await api('/products', {
    token,
    method: 'POST',
    body: {
      slug: 'smoke-test-product',
      name: 'Duplicate',
      category: adminList.body.products[0].category._id,
      variants: [{ label: '1 kg', price: 100, isActive: true }],
    },
  });
  check('duplicate slug is rejected', duplicate.status === 409, `got ${duplicate.status}`);

  const toggled = await api(`/products/${productId}/visibility`, {
    token,
    method: 'PATCH',
    body: { isActive: false },
  });
  check('visibility toggle works', toggled.body.product?.isActive === false);

  /**
   * Regression: a PATCH must not wipe fields it did not mention.
   *
   * Zod's .partial() makes keys optional but still fires their .default() when
   * absent, so a PATCH of only { variants } used to parse into an object also
   * carrying nameHindi:'', images:[], description:'' — and findByIdAndUpdate
   * wrote all of them. Editing a price silently erased the product's Hindi
   * name and photo. Caught by using the panel, not by reading the code.
   */
  console.log('\nPATCH does not wipe untouched fields');
  const rich = await api('/products', {
    token,
    method: 'POST',
    body: {
      slug: 'smoke-patch-target',
      name: 'Patch Target',
      nameHindi: 'पैच लक्ष्य',
      description: 'Should survive a price edit',
      category: adminList.body.products[0].category._id,
      images: ['/Products/Toor_dal.jpg'],
      tags: ['bestseller'],
      variants: [{ label: '1 kg', price: 5000, isActive: true }],
    },
  });
  const richId = rich.body.product?._id;

  const afterPatch = await api(`/products/${richId}`, {
    token,
    method: 'PATCH',
    body: {
      variants: [
        { _id: rich.body.product.variants[0]._id, label: '1 kg', price: 6000, mrp: null, isActive: true },
      ],
    },
  });

  check('price actually changed', afterPatch.body.product?.variants[0]?.price === 6000);
  check('nameHindi survived', afterPatch.body.product?.nameHindi === 'पैच लक्ष्य',
    JSON.stringify(afterPatch.body.product?.nameHindi));
  check('images survived', afterPatch.body.product?.images?.length === 1,
    JSON.stringify(afterPatch.body.product?.images));
  check('description survived', afterPatch.body.product?.description === 'Should survive a price edit');
  check('tags survived', afterPatch.body.product?.tags?.length === 1);

  await api(`/products/${richId}`, { token, method: 'DELETE' });

  // ── Category delete guard ────────────────────────────────────────────────
  console.log('\nCategory guard');
  const catInUse = adminList.body.products[0].category._id;
  const delCat = await api(`/categories/${catInUse}`, { token, method: 'DELETE' });
  check('cannot delete a category still in use', delCat.status === 409, `got ${delCat.status}`);

  // ── Coupons ──────────────────────────────────────────────────────────────
  console.log('\nCoupons');
  const coupon = await api('/coupons', {
    token,
    method: 'POST',
    body: { code: 'SMOKE50', type: 'percent', value: 50, minOrder: 50000, maxDiscount: 10000 },
  });
  check('admin can create a coupon', coupon.status === 201, JSON.stringify(coupon.body).slice(0, 120));
  const couponId = coupon.body.coupon?._id;

  const over100 = await api('/coupons', {
    token,
    method: 'POST',
    body: { code: 'SMOKE200', type: 'percent', value: 200 },
  });
  check('percent above 100 is rejected', over100.status === 400, `got ${over100.status}`);

  const belowMin = await api('/coupons/validate', {
    token,
    method: 'POST',
    body: { code: 'SMOKE50', subtotal: 10000 },
  });
  check('coupon below minimum order is refused', belowMin.status === 400);
  check(
    'refusal explains why',
    typeof belowMin.body.error === 'string' && belowMin.body.error.includes('500'),
    belowMin.body.error
  );

  const valid = await api('/coupons/validate', {
    token,
    method: 'POST',
    body: { code: 'SMOKE50', subtotal: 100000 },
  });
  check('valid coupon returns a discount', valid.status === 200);
  check(
    'maxDiscount caps the discount at 100 rupees',
    valid.body.discount === 10000,
    `got ${valid.body.discount}`
  );

  const unknown = await api('/coupons/validate', {
    token,
    method: 'POST',
    body: { code: 'NOPE', subtotal: 100000 },
  });
  check('unknown coupon is refused', unknown.status === 404);

  // ── Order price integrity ────────────────────────────────────────────────
  console.log('\nOrder integrity');
  const realProduct = publicList.body.products[0];
  const orderBody = {
    items: [
      { productId: realProduct._id, variantId: realProduct.variants[0]._id, quantity: 2 },
    ],
    address: {
      street: '1 Test Street',
      city: 'Delhi',
      state: 'Delhi',
      zipCode: '110001',
    },
  };

  const expectedTotal = realProduct.variants[0].price * 2;

  const order = await api('/orders', { token, method: 'POST', body: orderBody });
  check('admin can place an order', order.status === 201, JSON.stringify(order.body).slice(0, 140));
  check(
    'server computes the total from its own prices',
    order.body.order?.total === expectedTotal,
    `expected ${expectedTotal}, got ${order.body.order?.total}`
  );
  check(
    'line item price is snapshotted from the catalogue',
    order.body.order?.items[0]?.price === realProduct.variants[0].price
  );
  check('order number is readable', /^TB-\d{4}-\d{4}$/.test(order.body.order?.orderNumber ?? ''),
    order.body.order?.orderNumber);

  /**
   * The important one. A client that can name its own price can buy a sack of
   * rice for a rupee, so the request is sent with price and subtotal fields
   * attached and the resulting order is checked against the real catalogue
   * price -- not merely checked for a non-error status.
   */
  const injected = await api('/orders', {
    token,
    method: 'POST',
    body: {
      ...orderBody,
      subtotal: 1,
      total: 1,
      items: [{ ...orderBody.items[0], price: 1, subtotal: 1 }],
    },
  });
  check(
    'injected prices are ignored, order still charges the real total',
    injected.body.order?.total === expectedTotal,
    `expected ${expectedTotal}, got ${injected.body.order?.total}`
  );

  const orderNumbers = [order.body.order?.orderNumber, injected.body.order?.orderNumber].filter(Boolean);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  console.log('\nCleanup');
  if (productId) {
    const del = await api(`/products/${productId}`, { token, method: 'DELETE' });
    check('test product removed', del.status === 200);
  }
  if (couponId) {
    const del = await api(`/coupons/${couponId}`, { token, method: 'DELETE' });
    check('test coupon removed', del.status === 200);
  }

  // Orders have no delete route by design -- a shop should not be able to make
  // an order vanish. These two are test noise, so remove them directly.
  if (orderNumbers.length) {
    const mongoose = (await import('mongoose')).default;
    const { default: Order } = await import('../models/Order.js');
    await mongoose.connect(process.env.MONGODB_URI);
    const { deletedCount } = await Order.deleteMany({ orderNumber: { $in: orderNumbers } });
    await mongoose.disconnect();
    check(`test orders removed (${deletedCount})`, deletedCount === orderNumbers.length);
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
};

run().catch((error) => {
  console.error(`\n✗ ${error.message}\n`);
  process.exit(1);
});
