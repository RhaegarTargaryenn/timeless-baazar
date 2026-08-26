import { HttpError } from '../utils/HttpError.js';
import config from '../config/env.js';

export const notFound = (req, _res, next) => {
  next(new HttpError(404, `No route for ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity
export const errorHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({
      error: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }

  // Anything else is unexpected: log it in full, tell the client nothing.
  console.error('[error]', error);

  return res.status(500).json({
    error: 'Something went wrong on our side.',
    ...(config.isProduction ? {} : { debug: error.message }),
  });
};
