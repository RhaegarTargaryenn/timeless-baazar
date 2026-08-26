import admin from 'firebase-admin';
import config from './env.js';

/**
 * Firebase Admin, used only to verify ID tokens minted by the storefront.
 *
 * This is the actual security boundary for the admin panel. The /admin route
 * being unlinked proves nothing — anyone can type a URL. What stops a stranger
 * editing prices is that every write goes through a verified token whose uid
 * has to appear in ADMIN_UIDS.
 */
const app = admin.initializeApp({
  credential: admin.credential.cert(config.firebaseServiceAccount),
});

export const firebaseAuth = admin.auth(app);

export default app;
