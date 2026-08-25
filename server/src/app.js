import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';

import config from './config/env.js';
import { attachUser } from './middleware/auth.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

import categoryRoutes from './routes/categories.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import couponRoutes from './routes/coupons.js';
import meRoutes from './routes/me.js';

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

        // In development Vite picks whatever port is free, so pinning exact
        // localhost ports just breaks the dev server at random. Production
        // stays restricted to the configured list.
        if (!config.isProduction && /^http:\/\/localhost:\d+$/.test(origin)) {
          return callback(null, true);
        }

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

  app.use('/api/me', meRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/coupons', couponRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

export default createApp;
