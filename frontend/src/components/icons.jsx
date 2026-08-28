/**
 * The app's icon set.
 *
 * Every icon in the storefront and the admin panel comes from here, and this is
 * the only file that names `@phosphor-icons/react`. Swapping sets again later
 * is one edit rather than twenty-three.
 *
 * ## Why Phosphor and not lucide
 *
 * lucide is a single 2px outline weight. That is a perfectly good *website*
 * icon set, and it is exactly what made this app read as a website: a native
 * tab bar does not merely recolour its icons when you switch tab, it fills
 * them. Phosphor ships every glyph in six weights -- thin, light, regular,
 * bold, fill, duotone -- from one package, so `regular` inactive and `fill`
 * active is a prop change rather than two icon sets bolted together.
 *
 * ## Why the names are lucide's
 *
 * The exports below keep the names the app already used, so migrating was an
 * import swap in each file and not a rewrite of every call site. That means
 * some names do not match Phosphor's own: `Search` is Phosphor's
 * `MagnifyingGlass`, `ChevronLeft` is `CaretLeft`, `Trash2` is `Trash`. **The
 * mapping is right here and it is the whole point of the file** -- read it as
 * this app's vocabulary, not as a claim about what Phosphor calls things.
 *
 * ## Weight
 *
 * The app-wide default is `bold`, set once via `IconContext` in `App.jsx`.
 * Phosphor's `regular` is roughly a 1.5px stroke against lucide's 2px, so
 * defaulting to `regular` would have made every screen abruptly lighter than
 * the design it was matched to. Pass `weight="regular"` on the large,
 * decorative ones and `weight="fill"` where something is selected or active.
 *
 * Sizing still works through Tailwind's `w-*` / `h-*`: Phosphor renders a plain
 * `<svg>` and the CSS wins over its own width/height attributes.
 */

export {
  // ── Navigation and chrome ────────────────────────────────────────────────
  Storefront as Store,
  SquaresFour as LayoutGrid,
  ShoppingCart,
  ShoppingBag,
  Receipt,
  User,
  House as Home,

  // ── Direction ────────────────────────────────────────────────────────────
  // Phosphor draws "chevron" as Caret. Its own `CaretLine*` are the ones with
  // the bar, which is not what any of these call sites mean.
  CaretLeft as ChevronLeft,
  CaretRight as ChevronRight,
  CaretDown as ChevronDown,
  ArrowLeft,
  ArrowRight,

  // ── Actions ──────────────────────────────────────────────────────────────
  Plus,
  Minus,
  X,
  Check,
  // Phosphor has both `Pencil` and `PencilSimple`; the simple one is the closer
  // match to what lucide drew and reads better at 16px.
  PencilSimple as Pencil,
  Trash as Trash2,
  DownloadSimple as Download,
  ArrowsClockwise as RefreshCw,
  MagnifyingGlass as Search,
  SlidersHorizontal,
  Eye,
  EyeSlash as EyeOff,

  // ── Status ───────────────────────────────────────────────────────────────
  CheckCircle as CheckCircle2,
  XCircle,
  Clock,
  Truck,
  Package,
  /**
   * "No products found."
   *
   * lucide's `PackageX` has no Phosphor equivalent and there is no sensible
   * compound. It falls back to the plain package: this only ever appears in an
   * empty state whose heading already says nothing was found, so the crossed-out
   * detail was carrying no information the customer did not already have.
   */
  Package as PackageX,
  /** Same reasoning as PackageX -- the empty state's text does the work. */
  MagnifyingGlass as SearchX,
  WifiSlash as WifiOff,

  // ── Account and identity ─────────────────────────────────────────────────
  IdentificationCard as IdCard,
  CreditCard,
  Wallet,
  SignOut as LogOut,
  Phone,
  MapPin,
  Briefcase,
  Shield,
  ShieldCheck,
  ShieldWarning as ShieldAlert,

  // ── Auth forms ───────────────────────────────────────────────────────────
  // Login and Signup drew these from `react-icons/hi` -- a third icon set in
  // the same app, which is why their fields never quite matched the rest.
  EnvelopeSimple as Mail,
  Lock as LockClosed,

  // ── Content ──────────────────────────────────────────────────────────────
  Heart,
  Tag,
  Ticket,
  Info,
  Question as HelpCircle,
  ChatCircle as MessageCircle,
  /**
   * The verify-your-email screen. Phosphor has no envelope-with-a-tick, and
   * `SealCheck` reads as "verified account" rather than "check your mail" --
   * the plain envelope is the honest one, and the screen's own copy says the
   * rest.
   */
  EnvelopeSimple as MailCheck,

  // ── Theme ────────────────────────────────────────────────────────────────
  Sun,
  Moon,

  /**
   * The in-button spinner.
   *
   * `CircleNotch` is Phosphor's spinner glyph -- an open ring, drawn to be
   * rotated. It replaces lucide's `Loader2` and still expects `animate-spin`
   * from the call site; nothing spins on its own.
   */
  CircleNotch as Loader2,
} from '@phosphor-icons/react';

/**
 * Re-exported so `App.jsx` can set the app-wide weight without importing the
 * icon package directly -- this file stays the only place that names it.
 */
export { IconContext } from '@phosphor-icons/react';
