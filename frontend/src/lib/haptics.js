/**
 * Haptic feedback.
 *
 * The cheapest thing in this app that makes it stop feeling like a website. A
 * 10ms tick under the thumb when something is added to the cart is most of what
 * separates a native app from a page that happens to be on a phone, and it
 * costs no dependency and no frame budget.
 *
 * **This is Android-only, and that is not a bug.** iOS Safari does not
 * implement the Vibration API at all -- there is no polyfill, no permission to
 * ask for, and no workaround short of shipping a native wrapper. Every call
 * here is a silent no-op on an iPhone. Roughly half the shop's customers are on
 * Android, so half of them get it and the other half lose nothing.
 *
 * Everything is wrapped so a caller never has to care: no feature checks at the
 * call site, no try/catch, no null guards. Fire and forget.
 */

/**
 * Patterns, in milliseconds. A number is one buzz; an array alternates
 * buzz/pause/buzz.
 *
 * These are deliberately much shorter than the Vibration API's own examples,
 * which are written for notifications rather than for touch feedback. Anything
 * past about 25ms stops reading as a click and starts reading as an alert --
 * the phone buzzing *at* you instead of confirming what your finger did. The
 * ladder below is tuned so a tab switch is barely perceptible and only a placed
 * order is unmistakable.
 */
const PATTERNS = {
  /** Navigation and selection: tab switch, chip, dot. Barely there on purpose. */
  tap: 8,
  /** A choice landed: added to cart, size picked, address selected. */
  select: 12,
  /** Something with weight: a line removed, a sheet committed. */
  impact: 18,
  /** Terminal success. The only pattern a customer should consciously notice. */
  success: [12, 40, 24],
  /** Refused, but recoverable -- an invalid coupon, a failed field. */
  warning: [16, 60, 16],
  /** It broke. Two sharp knocks read as "no" without being punishing. */
  error: [20, 50, 20],
};

const STORAGE_KEY = 'timeless-baazar-haptics';

/**
 * Whether the Vibration API exists at all.
 *
 * Resolved once at module load rather than per call. `navigator.vibrate` is
 * either there or it is not; it does not appear later.
 */
const SUPPORTED =
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

/**
 * The opt-out.
 *
 * Read once into a mutable flag so the common path never touches localStorage
 * -- these fire on every tap, and a synchronous storage read per tap is a real
 * cost on a cheap phone. There is no settings toggle wired to this yet; it
 * exists so one is a two-line change rather than a refactor, and so a customer
 * who finds it irritating can be told to run one line in the console.
 */
let enabled = true;

try {
  enabled = localStorage.getItem(STORAGE_KEY) !== 'off';
} catch {
  // Private windows and blocked site data both land here. Default to on.
}

/**
 * The last time we buzzed.
 *
 * Holding a finger on the stepper's + button fires this many times a second.
 * Without a floor the motor never gets to settle between pulses and the whole
 * phone turns into a continuous rattle, which feels broken rather than
 * responsive. 40ms is under the threshold where consecutive taps feel
 * individually acknowledged, but long enough that a held button stutters
 * instead of screaming.
 */
let lastFiredAt = 0;
const MIN_INTERVAL_MS = 40;

/**
 * Fire a pattern.
 *
 * @param {keyof PATTERNS} name  which pattern; unknown names are ignored
 */
export const haptic = (name) => {
  if (!SUPPORTED || !enabled) return;

  const pattern = PATTERNS[name];
  if (pattern === undefined) return;

  // A backgrounded tab should never buzz the phone in someone's pocket. Chrome
  // drops these anyway, but it warns to the console every time.
  if (typeof document !== 'undefined' && document.hidden) return;

  const now = Date.now();
  if (now - lastFiredAt < MIN_INTERVAL_MS) return;
  lastFiredAt = now;

  try {
    navigator.vibrate(pattern);
  } catch {
    // Some Android browsers throw instead of returning false when the call is
    // made without user activation. Feedback failing is never worth an error.
  }
};

/** Turn haptics off (or back on) for this browser, persistently. */
export const setHapticsEnabled = (next) => {
  enabled = Boolean(next);
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // Not persisting is survivable; the flag still holds for this session.
  }
};

/** Whether this device can do haptics at all. For settings UI, not for callers. */
export const hapticsSupported = SUPPORTED;

export default haptic;
