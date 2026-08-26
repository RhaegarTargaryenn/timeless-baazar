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
    req.isAdmin = config.adminUids.includes(decoded.uid);
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
 * Reject anything whose uid is not in ADMIN_UIDS.
 *
 * Checked against config rather than a database field on purpose — a role flag
 * in Mongo can be flipped by anything that can write to that collection, an
 * env var cannot.
 */
export const requireAdmin = (req, _res, next) => {
  if (!req.user) {
    return next(new HttpError(401, 'You need to be signed in to do that.'));
  }

  if (!config.adminUids.includes(req.user.uid)) {
    // Deliberately vague: telling a caller that the route exists but they are
    // not an admin is more than they need to know.
    return next(new HttpError(403, 'Not allowed.'));
  }

  return next();
};
