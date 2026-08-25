import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';

import config from './config/env.js';
import { attachUser } from './middleware/auth.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

export const createApp = () => {
  const app = express();

  // Render terminates TLS in front of us, so req.ip and secure-cookie handling
  // only work if Express trusts that hop.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));

  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin and server-to-server calls arrive without an Origin
        // header; those are not the case CORS is protecting against.
        if (!origin) return callback(null, true);

        if (config.corsOrigins.includes(origin)) return callback(null, true);

        return callback(new Error(`Origin not allowed: ${origin}`));
      },
      credentials: true,
    })
  );

  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      // The keep-alive ping must never be able to exhaust a real user's quota.
      skip: (req) => req.path === '/health',
    })
  );

  /**
   * Health check, also the target of the keep-alive cron.
   *
   * Render's free tier sleeps after 15 minutes idle and takes roughly a minute
   * to wake. A ping every 14 minutes keeps it warm; the storefront's cached
   * product list covers the gap when it does not.
   *
   * Reports the database state as well, because "the process is up" and "the
   * API can serve a request" are not the same thing here.
   */
  app.get('/health', (_req, res) => {
    const dbState = mongoose.connection.readyState; // 1 = connected
    res.status(dbState === 1 ? 200 : 503).json({
      status: dbState === 1 ? 'ok' : 'degraded',
      db: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] ?? 'unknown',
      uptime: Math.round(process.uptime()),
    });
  });

  // Every route below can read req.user; requireAuth / requireAdmin decide
  // what to do about it.
  app.use(attachUser);

  // Routes are mounted in Phase 2 once the schema is settled:
  //   app.use('/api/products', productRoutes);
  //   app.use('/api/orders', orderRoutes);
  //   app.use('/api/coupons', couponRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

export default createApp;
