import { HttpError } from '../utils/HttpError.js';

/**
 * Validate part of a request against a Zod schema and replace it with the
 * parsed result, so handlers work with coerced, trusted values.
 *
 * Failures come back as a 400 listing every bad field at once rather than the
 * first one, which is what an admin form needs to highlight its inputs.
 */
export const validate = (schema, source = 'body', { onlyProvided = false } = {}) => (
  req,
  _res,
  next
) => {
  const input = req[source];
  const result = schema.safeParse(input);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || source,
      message: issue.message,
    }));
    return next(new HttpError(400, 'Some fields need fixing.', details));
  }

  let data = result.data;

  /**
   * For PATCH, keep only the keys the caller actually sent.
   *
   * Zod's .partial() makes fields optional but still fires any .default() on a
   * missing key. So a PATCH of just { variants } parsed into an object that
   * also carried nameHindi: '', images: [], description: '' — and
   * findByIdAndUpdate happily wrote all of them, wiping a product's Hindi name
   * and photo every time someone edited its price.
   */
  if (onlyProvided && input && typeof input === 'object') {
    const sent = Object.keys(input);
    data = Object.fromEntries(Object.entries(data).filter(([key]) => sent.includes(key)));
  }

  req.valid = { ...(req.valid ?? {}), [source]: data };
  if (source === 'body') req.body = data;

  return next();
};

export default validate;
