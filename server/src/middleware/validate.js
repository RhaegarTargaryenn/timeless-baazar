import { HttpError } from '../utils/HttpError.js';

/**
 * Validate part of a request against a Zod schema and replace it with the
 * parsed result, so handlers work with coerced, trusted values.
 *
 * Failures come back as a 400 listing every bad field at once rather than the
 * first one, which is what an admin form needs to highlight its inputs.
 */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || source,
      message: issue.message,
    }));
    return next(new HttpError(400, 'Some fields need fixing.', details));
  }

  // req.query is a getter in Express 5, so assigning to it throws. Handlers
  // read the parsed values from req.valid instead.
  req.valid = { ...(req.valid ?? {}), [source]: result.data };
  if (source === 'body') req.body = result.data;

  return next();
};

export default validate;
