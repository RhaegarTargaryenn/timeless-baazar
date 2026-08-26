import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * The shared primitives.
 *
 * Every screen builds from these so a button looks the same everywhere and a
 * change to the shape of a card is one edit. Before this the same button was
 * written out with slightly different padding and radius in a dozen places.
 */

const cx = (...classes) => classes.filter(Boolean).join(' ');

// ── Button ─────────────────────────────────────────────────────────────────

const BUTTON_VARIANTS = {
  primary:
    'bg-brand-600 text-white shadow-brand hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-600/50',
  secondary:
    'bg-surface-raised text-ink border border-line hover:bg-surface-sunken active:bg-surface-sunken',
  ghost: 'text-ink-muted hover:bg-surface-sunken active:bg-surface-sunken',
  danger:
    'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60',
};

const BUTTON_SIZES = {
  // 44px is the smallest comfortable touch target on a phone; nothing here
  // goes below it.
  sm: 'h-10 px-3.5 text-sm rounded-xl gap-1.5',
  md: 'h-12 px-5 text-sm rounded-2xl gap-2',
  lg: 'h-14 px-6 text-base rounded-2xl gap-2',
};

export const Button = ({
  as,
  to,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...rest
}) => {
  const Component = as ?? (to ? Link : 'button');

  return (
    <Component
      to={to}
      disabled={Component === 'button' ? disabled || loading : undefined}
      className={cx(
        'inline-flex items-center justify-center font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        'disabled:cursor-not-allowed disabled:opacity-60',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </Component>
  );
};

// ── Icon button ────────────────────────────────────────────────────────────

export const IconButton = ({ label, className, children, ...rest }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={cx(
      'inline-flex items-center justify-center w-11 h-11 rounded-xl text-ink-muted',
      'hover:bg-surface-sunken active:bg-surface-sunken transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      className
    )}
    {...rest}
  >
    {children}
  </button>
);

// ── Card ───────────────────────────────────────────────────────────────────

export const Card = ({ as: Component = 'div', className, children, ...rest }) => (
  <Component
    className={cx(
      'bg-surface-raised border border-line rounded-card shadow-card',
      className
    )}
    {...rest}
  >
    {children}
  </Component>
);

// ── Chip ───────────────────────────────────────────────────────────────────

export const Chip = ({ active = false, className, children, ...rest }) => (
  <button
    type="button"
    className={cx(
      'shrink-0 h-9 px-4 rounded-full text-sm font-semibold whitespace-nowrap transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
      active
        ? 'bg-brand-600 text-white'
        : 'bg-surface-raised text-ink-muted border border-line hover:text-ink',
      className
    )}
    {...rest}
  >
    {children}
  </button>
);

// ── Input ──────────────────────────────────────────────────────────────────

export const Input = React.forwardRef(({ icon, className, error, ...rest }, ref) => (
  <div className="relative">
    {icon && (
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none">
        {icon}
      </span>
    )}
    <input
      ref={ref}
      className={cx(
        'w-full h-12 rounded-2xl bg-surface-raised text-ink placeholder:text-ink-faint',
        'border transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500',
        error ? 'border-red-400' : 'border-line',
        icon ? 'pl-11 pr-4' : 'px-4',
        className
      )}
      {...rest}
    />
  </div>
));
Input.displayName = 'Input';

export const Field = ({ label, hint, error, children }) => (
  <div>
    {label && (
      <label className="block text-xs font-semibold text-ink-muted mb-1.5">{label}</label>
    )}
    {children}
    {error ? (
      <p className="text-xs text-red-500 mt-1">{error}</p>
    ) : (
      hint && <p className="text-xs text-ink-faint mt-1">{hint}</p>
    )}
  </div>
);

// ── Skeleton ───────────────────────────────────────────────────────────────

/**
 * A shimmering placeholder.
 *
 * Used instead of a spinner wherever the shape of what is coming is known — it
 * reads as "loading this page" rather than "something is happening somewhere".
 */
export const Skeleton = ({ className }) => (
  <div className={cx('relative overflow-hidden bg-surface-sunken rounded-xl', className)}>
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-black/[0.04] dark:via-white/[0.06] to-transparent" />
  </div>
);

// ── Empty state ────────────────────────────────────────────────────────────

export const EmptyState = ({ icon, title, message, action }) => (
  <div className="flex flex-col items-center text-center py-16 px-6">
    {icon && (
      <div className="w-16 h-16 rounded-2xl bg-surface-sunken flex items-center justify-center text-ink-faint mb-4">
        {icon}
      </div>
    )}
    <h3 className="text-base font-bold text-ink mb-1">{title}</h3>
    {message && <p className="text-sm text-ink-muted max-w-xs mb-5">{message}</p>}
    {action}
  </div>
);

// ── Badge ──────────────────────────────────────────────────────────────────

const BADGE_TONES = {
  brand: 'bg-brand-600 text-white',
  neutral: 'bg-surface-sunken text-ink-muted',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
};

export const Badge = ({ tone = 'neutral', className, children }) => (
  <span
    className={cx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold',
      BADGE_TONES[tone],
      className
    )}
  >
    {children}
  </span>
);

// ── Section header ─────────────────────────────────────────────────────────

export const SectionHeader = ({ title, action, actionTo }) => (
  <div className="flex items-baseline justify-between gap-3 mb-3">
    <h2 className="text-lg font-bold text-ink">{title}</h2>
    {action && (
      <Link to={actionTo} className="text-sm font-semibold text-brand-600 shrink-0">
        {action}
      </Link>
    )}
  </div>
);

export { cx };
