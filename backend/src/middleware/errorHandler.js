import { HttpError } from '../utils/HttpError.js';
import config from '../config/env.js';

export const notFound = (req, _res, next) => {
  next(new HttpError(404, `No route for ${req.method} ${req.originalUrl}`));
};

/**
 * Mongoose's own errors, translated into the shape the rest of the API speaks.
 *
 * Without this they fell through to the 500 below, which is a lie: a caller
 * who sent a malformed id or a duplicate slug made a bad request, and telling
 * them "something went wrong on our side" sends them looking for a fault that
 * is not there -- while burying a real 500 among the noise in Render's logs.
 *
 * Returns null for anything that is genuinely not the caller's doing.
 */
const fromMongoose = (error) => {
  // A path that could not be cast -- almost always a bad :id in the URL.
  if (error.name === 'CastError') {
    return new HttpError(400, `"${error.value}" is not a valid ${error.path}.`);
  }

  // A schema rule the request broke. Zod catches most of these at the
  // boundary; this covers the rules that only exist on the model.
  if (error.name === 'ValidationError') {
    return new HttpError(
      400,
      'Some fields need fixing.',
      Object.values(error.errors).map((issue) => ({
        field: issue.path,
        message: issue.message,
      }))
    );
  }

  // A unique index rejected the write -- a slug or coupon code already taken.
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue ?? {})[0];
    return new HttpError(
      409,
      field ? `That ${field} is already taken.` : 'That already exists.'
    );
  }

  return null;
};

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity
export const errorHandler = (error, _req, res, _next) => {
  const known = error instanceof HttpError ? error : fromMongoose(error);

  if (known) {
    return res.status(known.status).json({
      error: known.message,
      ...(known.details ? { details: known.details } : {}),
    });
  }

  // Anything else is unexpected: log it in full, tell the client nothing.
  console.error('[error]', error);

  return res.status(500).json({
    error: 'Something went wrong on our side.',
    ...(config.isProduction ? {} : { debug: error.message }),
  });
};
