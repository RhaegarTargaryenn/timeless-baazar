import mongoose from 'mongoose';
import config from './env.js';

/**
 * Connect to MongoDB Atlas.
 *
 * `bufferCommands: false` matters on Render's free tier: without it, queries
 * issued while the connection is down queue up silently and then all time out
 * at once. Failing fast gives the storefront something to fall back on.
 */
export const connectDatabase = async () => {
  mongoose.set('strictQuery', true);
  mongoose.set('bufferCommands', false);

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] disconnected from MongoDB');
  });

  mongoose.connection.on('error', (error) => {
    console.error('[db] connection error:', error.message);
  });

  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log('[db] connected to MongoDB');
};

export const disconnectDatabase = () => mongoose.connection.close();

export default connectDatabase;
