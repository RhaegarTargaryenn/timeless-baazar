/**
 * Forward rejected promises to Express's error handler.
 *
 * Express 5 does this for async handlers on its own, but wrapping keeps the
 * intent explicit and means a handler that throws synchronously behaves the
 * same way as one that rejects.
 */
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export default asyncHandler;
