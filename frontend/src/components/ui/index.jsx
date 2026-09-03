import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from '../icons';

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
  // `active:shadow-press` collapses the lift on touch-down, so the button drops
  // toward the page as it shrinks instead of hovering at the same height while
  // getting smaller. That combination is what reads as physically pushed.
  primary:
    'bg-brand-600 text-white shadow-brand active:shadow-press hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-600/50',
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
        // Shadow is in the transition too, or the press drop would snap.
        'inline-flex items-center justify-center font-semibold transition-[color,background-color,border-color,box-shadow] duration-150',
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
export const Skeleton = ({ className, ...rest }) => (
  <div
    className={cx('relative overflow-hidden bg-surface-sunken rounded-xl', className)}
    {...rest}
  >
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-black/[0.04] dark:via-white/[0.06] to-transparent" />
  </div>
);

/**
 * The whole-screen placeholder, for the gap before a route's chunk arrives and
 * while the session is still being restored.
 *
 * A centred spinner is the most website-like thing an app can show: it says
 * "something is happening somewhere" and gives the eye nothing to settle on, so
 * a 400ms wait and a 4s wait look identical. This paints the shape that is
 * coming instead, which reads as the screen already being here and merely
 * unfinished -- the same reason the product grid uses skeletons.
 *
 * Deliberately generic. It stands in for Home, Cart, Orders and Checkout alike,
 * so it commits to nothing more specific than a title, a wide block and a few
 * rows. Guessing a layout and guessing wrong is worse than not guessing: the
 * content lands and visibly rearranges.
 */
export const PageSkeleton = () => (
  <div
    className="min-h-screen bg-surface px-[25px] pt-6"
    /*
      A screen reader should hear that something is loading, not read out the
      shape of nine empty boxes.
    */
    role="status"
    aria-label="Loading"
  >
    <Skeleton className="h-7 w-1/2 rounded-lg" />
    <Skeleton className="h-[51px] w-full mt-6 rounded-[15px]" />
    <Skeleton className="h-[115px] w-full mt-6 rounded-lg" />

    <div className="mt-7 space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton
          key={index}
          className="h-16 rounded-card"
          /*
            Each row a little fainter than the one above it. The eye reads the
            fade as "the list continues past here" rather than as four items
            that happen to be blank.
          */
          style={{ opacity: 1 - index * 0.18 }}
        />
      ))}
    </div>
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

/**
 * "The shop is opening" — the cold-start line.
 *
 * The API sleeps on Render's free tier and takes about a minute to wake, so the
 * first visit of the morning can sit on skeletons far longer than a load has any
 * right to. Silence there reads as broken; people reload, or leave. This says
 * what is happening in the shop's own terms -- a customer does not know what a
 * container is, and does not need to -- and appears only once the wait is long
 * enough to notice, so an ordinary load never shows it.
 *
 * `role="status"` and not an alert: it is information, not a problem.
 */
export const WakingNotice = ({ className }) => (
  <div
    role="status"
    className={cx(
      'flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-surface-sunken',
      className
    )}
  >
    <Loader2 className="w-4 h-4 shrink-0 animate-spin text-brand-600" />
    <p className="text-[13px] font-medium text-ink-muted">
      Opening the shop — just a moment.
    </p>
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

// ── Table ──────────────────────────────────────────────────────────────────

/**
 * A data table, for the admin panel on a desktop.
 *
 * The structure is shadcn/ui's `table` -- semantic `<table>` markup with the
 * styling on the cells -- which is worth copying because it is one of the few
 * pieces in that library with **no Radix dependency at all**: it is plain HTML
 * and Tailwind classes, so it comes across without installing anything and
 * without dragging in shadcn's `--background` / `--primary` variables, which
 * would fight this app's `surface` / `ink` / `brand` tokens. The colours below
 * are ours; only the anatomy is borrowed.
 *
 * **Desktop only, by intent.** The admin screens are card lists on a phone and
 * stay that way -- a table on a 375px screen is a horizontal scrollbar with
 * data hiding behind it. Call sites render this inside `hidden lg:block` and
 * hide the cards with `lg:hidden`, so the two are alternatives rather than a
 * layout that has to work at every width.
 *
 * The wrapper still scrolls sideways: a long customer name or a wide address
 * should push a scrollbar inside the table rather than the page.
 */
export const Table = ({ className, children, ...rest }) => (
  <div className="w-full overflow-x-auto rounded-card border border-line bg-surface-raised">
    <table className={cx('w-full text-sm border-collapse', className)} {...rest}>
      {children}
    </table>
  </div>
);

export const THead = ({ className, children, ...rest }) => (
  <thead className={cx('bg-surface-sunken', className)} {...rest}>
    {children}
  </thead>
);

export const TBody = ({ className, children, ...rest }) => (
  <tbody className={className} {...rest}>
    {children}
  </tbody>
);

/**
 * `interactive` is for a row that does something when clicked. It carries the
 * hover tint and the pointer; a plain row must not, or every row looks
 * clickable and only some are.
 */
export const TR = ({ interactive = false, className, children, ...rest }) => (
  <tr
    className={cx(
      'border-b border-line last:border-b-0',
      interactive && 'cursor-pointer transition-colors hover:bg-surface-sunken/70',
      className
    )}
    {...rest}
  >
    {children}
  </tr>
);

export const TH = ({ align = 'left', className, children, ...rest }) => (
  <th
    scope="col"
    className={cx(
      'h-10 px-3 text-[12px] font-semibold uppercase tracking-wide text-ink-faint whitespace-nowrap',
      align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
      className
    )}
    {...rest}
  >
    {children}
  </th>
);

export const TD = ({ align = 'left', className, children, ...rest }) => (
  <td
    className={cx(
      'px-3 py-3 align-middle text-ink',
      align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
      className
    )}
    {...rest}
  >
    {children}
  </td>
);

export { cx };
