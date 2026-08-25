import config from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { createApp } from './app.js';

const start = async () => {
  await connectDatabase();

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[api] listening on :${config.port} (${config.nodeEnv})`);
  });

  // Render sends SIGTERM before replacing an instance. Draining in-flight
  // requests first avoids dropping an order mid-write.
  const shutdown = async (signal) => {
    console.log(`[api] ${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });

    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start().catch((error) => {
  console.error('[api] failed to start:', error.message);
  process.exit(1);
});
