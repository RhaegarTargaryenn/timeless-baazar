/**
 * Shared motion vocabulary.
 *
 * Every transition in the app comes from here, so the whole thing moves with
 * one personality instead of each component inventing its own easing. The
 * springs are tuned to feel like a native app: quick, slightly weighted, and
 * settling without a visible wobble.
 */

/** The house easing. A steep start that decelerates — reads as responsive. */
export const EASE = [0.22, 1, 0.36, 1];

export const spring = {
  /** Sheets and anything large that travels a distance. */
  sheet: { type: 'spring', stiffness: 380, damping: 40, mass: 0.9 },
  /** Buttons, chips, badges — small things that should feel snappy. */
  snappy: { type: 'spring', stiffness: 520, damping: 32, mass: 0.5 },
  /** Layout shifts, e.g. the add button morphing into a stepper. */
  layout: { type: 'spring', stiffness: 420, damping: 36, mass: 0.7 },
};

export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.18, ease: EASE },
};

/** Page-level enter. Small travel — a big slide on every route feels sluggish. */
export const pageIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: EASE },
};

/**
 * Staggered grids.
 *
 * Capped deliberately: with 71 products an uncapped stagger would leave the
 * last card arriving seconds after the first.
 */
export const gridContainer = {
  animate: { transition: { staggerChildren: 0.035, delayChildren: 0.02 } },
};

export const gridItem = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } },
};

/** Bottom sheet. */
export const sheetMotion = {
  initial: { y: '100%' },
  animate: { y: 0 },
  exit: { y: '100%', transition: { duration: 0.22, ease: EASE } },
  transition: spring.sheet,
};

/** Press feedback for anything tappable. */
export const tap = { scale: 0.96 };

/**
 * Framer's reduced-motion handling still runs layout animations, which is
 * usually what someone with vestibular sensitivity is trying to avoid. Passing
 * this through `transition` collapses them to instant.
 */
export const instant = { duration: 0 };
