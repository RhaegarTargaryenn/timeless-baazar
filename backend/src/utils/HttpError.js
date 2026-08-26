/**
 * An error carrying the status code it should become.
 *
 * Anything thrown that is not an HttpError is treated as a bug and reported as
 * a generic 500, so internal messages and stack traces never reach a client.
 */
export class HttpError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export default HttpError;
