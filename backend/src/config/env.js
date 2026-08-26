import 'dotenv/config';

/**
 * Read and validate configuration once, at boot.
 *
 * A missing variable should stop the process here with a clear message, not
 * surface later as a confusing runtime failure — on Render a bad deploy that
 * boots and then 500s is much harder to diagnose than one that never boots.
 */
const required = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        'Copy backend/.env.example to backend/.env and fill it in.'
    );
  }
  return value;
};

const optional = (name, fallback) => process.env[name] ?? fallback;

export const config = {
  nodeEnv: optional('NODE_ENV', 'development'),
  isProduction: optional('NODE_ENV', 'development') === 'production',

  port: Number(optional('PORT', 4000)),

  mongoUri: required('MONGODB_URI'),

  /**
   * Browsers allowed to call this API. Comma-separated.
   * The deployed storefront and localhost during development.
   */
  corsOrigins: optional('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  /**
   * Firebase service account, as a single-line JSON string.
   *
   * Render's dashboard cannot hold a multi-line value cleanly, so the whole
   * JSON goes into one variable rather than shipping the key file itself —
   * a downloaded .json in the repo is the classic way a private key leaks.
   */
  firebaseServiceAccount: JSON.parse(required('FIREBASE_SERVICE_ACCOUNT')),

  /**
   * Firebase UIDs allowed to write products and coupons. Comma-separated.
   *
   * A list in config rather than a role flag in the database, deliberately:
   * there is exactly one admin today, and an env var cannot be escalated by
   * anything that manages to write to the users collection.
   */
  adminUids: optional('ADMIN_UIDS', '')
    .split(',')
    .map((uid) => uid.trim())
    .filter(Boolean),

  /** Google Apps Script endpoint that mirrors orders into the client's Sheet. */
  sheetsWebappUrl: optional('SHEETS_WEBAPP_URL', ''),
};

export default config;
