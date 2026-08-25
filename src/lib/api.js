import { auth } from '../firebase/config';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * An error that carries what the server actually said.
 *
 * The API returns `{ error, details }`, where details is a per-field list from
 * validation. Preserving both means a form can highlight the offending inputs
 * instead of dropping a generic "something went wrong" on the page.
 */
export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Firebase ID tokens expire after an hour. getIdToken() returns the cached one
 * and refreshes it only when it is close to expiring, so calling this per
 * request is cheap and means a long session never starts 401ing.
 */
const getAuthHeader = async () => {
  const user = auth.currentUser;
  if (!user) return {};

  try {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    // A refresh can fail if the account was disabled or the token revoked.
    // Send the request unauthenticated and let the server decide.
    return {};
  }
};

const request = async (path, { method = 'GET', body, signal } = {}) => {
  const authHeader = await getAuthHeader();

  let response;
  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      method,
      signal,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...authHeader,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;

    // Render's free tier sleeps after 15 minutes and takes about a minute to
    // wake, so an unreachable API is a normal state, not necessarily a bug.
    throw new ApiError(0, 'Could not reach the server. Please check your connection.');
  }

  if (response.status === 204) return null;

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError(response.status, 'The server sent something unexpected.');
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error ?? `Request failed (${response.status})`,
      payload?.details ?? null
    );
  }

  return payload;
};

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};

// ── Money ──────────────────────────────────────────────────────────────────
// The API speaks integer paise throughout. Rupees exist only for display and
// for what the client types into a form.

export const paiseToRupees = (paise) =>
  Number.isFinite(paise) ? Math.round(paise) / 100 : 0;

export const rupeesToPaise = (rupees) => {
  const value = Number(rupees);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
};

export const formatRupees = (paise) => {
  if (!Number.isFinite(paise)) return '—';
  const rupees = paise / 100;
  // Whole rupees are the norm here; only show paise when there are any.
  return `₹${rupees % 1 === 0 ? rupees.toFixed(0) : rupees.toFixed(2)}`;
};

export default api;
