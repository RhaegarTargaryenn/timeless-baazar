import { firebaseAuth } from '../config/firebase.js';
import config from '../config/env.js';
import { HttpError } from '../utils/HttpError.js';

/**
 * Pull a Firebase ID token off the Authorization header, if there is one.
 * Never throws — `requireAuth` decides whether absence is a problem.
 */
const readToken = (req) => {
  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
};

/**
 * Is this token an admin's?
 *
 * Two sources, and either is enough.
 *
 * **The `admin` custom claim is the real one.** It is set with the Admin SDK
 * (`npm run set-admin`), lives in Firebase beside the account itself, and can
 * only be written by something already holding the service account key -- so it
 * is exactly as unforgeable as the env list it replaces, and unlike that list
 * it cannot be flipped by anything that manages to write to a database.
 *
 * The claim travels inside the signed token, so granting one no longer means
 * editing an environment variable and waiting for a redeploy. That mattered:
 * `ADMIN_UIDS` on Render drifted out of step with the local one and the shop
 * owner was an admin on a developer's laptop and not in their own shop.
 *
 * **`ADMIN_UIDS` is kept as a fallback, deliberately.** Dropping it in the same
 * change that introduces claims would mean one missed step locks the client out
 * of their own panel, and the recovery needs the very access that was just
 * lost. Once `npm run set-admin --list` shows everyone who should be there, the
 * variable can be emptied in Render and here -- nothing else has to change.
 */
export const isAdminToken = (decoded) =>
  decoded.admin === true || config.adminUids.includes(decoded.uid);

/**
 * Attach `req.user` when the request carries a valid token, otherwise leave it
 * null and carry on. Used on routes that behave differently for a signed-in
 * visitor but do not require one.
 */
export const attachUser = async (req, _res, next) => {
  const token = readToken(req);
  if (!token) {
    req.user = null;
    req.isAdmin = false;
    return next();
  }

  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: Boolean(decoded.email_verified),
      name: decoded.name ?? null,
    };
    // Read-only routes use this to decide whether to include hidden rows.
    // Writes still go through requireAdmin -- this flag never grants anything.
    req.isAdmin = isAdminToken(decoded);
  } catch {
    // A malformed or expired token is treated as "not signed in" rather than
    // an error: an expired token during a long session is normal, and the
    // client refreshes and retries.
    req.user = null;
    req.isAdmin = false;
  }

  return next();
};

/** Reject anything without a valid token. */
export const requireAuth = (req, _res, next) => {
  if (!req.user) {
    return next(new HttpError(401, 'You need to be signed in to do that.'));
  }
  return next();
};

/**
 * Reject anyone who is not an admin.
 *
 * Reads `req.isAdmin`, which `attachUser` worked out from the verified token --
 * so this and the read-only routes can never disagree about who is an admin,
 * and there is one place to change the rule. Nothing here is derived from a
 * database field: a role flag in Mongo can be flipped by anything that can
 * write to that collection, a signed claim and an env var cannot.
 *
 * Fails closed. If `attachUser` were ever unmounted, `req.isAdmin` is undefined
 * and everyone is refused, rather than everyone being let in.
 */
export const requireAdmin = (req, _res, next) => {
  if (!req.user) {
    return next(new HttpError(401, 'You need to be signed in to do that.'));
  }

  if (req.isAdmin !== true) {
    // Deliberately vague: telling a caller that the route exists but they are
    // not an admin is more than they need to know.
    return next(new HttpError(403, 'Not allowed.'));
  }

  return next();
};
