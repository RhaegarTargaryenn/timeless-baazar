# Timeless Baazar

Grocery storefront PWA for a real shop. React + Vite + Tailwind, Firebase Auth,
deployed to Netlify.

## Read this first

**[docs/PROJECT_LOG.md](docs/PROJECT_LOG.md)** — the running log of an in-progress
rebuild: why we are doing it, decisions already settled, which phase we are on,
and what is deliberately left undone. Start every session there.

## Layout

The repo is two independent npm packages. There is **no package.json at the
root** — every npm command runs inside one of these folders.

```
frontend/   React + Vite storefront and /admin panel. Netlify builds this
            (netlify.toml sets base = "frontend").
backend/    Express API on :4000, MongoDB Atlas. Deploys to Render.
docs/       PROJECT_LOG.md and the rest.
```

## Commands

```bash
cd frontend && npm run dev      # Vite dev server, http://localhost:3000
cd frontend && npm run build    # → frontend/build/  (outDir is "build", not
                                #   "dist", so netlify.toml matches)
cd frontend && npm run preview  # serve the production build

cd backend && npm run dev       # API on :4000
cd backend && npm run seed      # reseed products
cd backend && npm run migrate-orders   # one-off: six old statuses -> two
```

## Conventions

- Components live in `src/components`, routed pages in `src/pages`. JSX files
  must use the `.jsx` extension — Vite will not parse JSX out of `.js`.
- The package is ESM (`"type": "module"`), so config files use `export default`.
- Env vars need the `VITE_` prefix and are read via `import.meta.env`.
  `process.env` does not exist in this app.
- **Orders have three statuses: `placed`, `completed`, `cancelled`.** The
  six-stage lifecycle is gone (see `ORDER_STATUSES` in
  `backend/src/models/Order.js`). `cancelled` is an **end state beside**
  `completed`, never a stage on the way to it -- never draw the three as a
  progress bar. Every transition is reversible; reopening returns an order to
  `placed`.
- **Cancelled orders must stay excluded from coupon-usage counts.** Both
  `routes/orders.js` and `routes/coupons.js` count a customer's past uses with
  `status: { $ne: 'cancelled' }`, and the two must stay in step. Without it, the
  shop voiding a mistaken order burns the customer's one use of a code for an
  order that never happened.
- **Admin is `ADMIN_UIDS`, an env var, and nothing else.** No uid is hardcoded
  anywhere in `src` — `config.adminUids` is the only reader, so the env var is
  the single place a change is ever made. It lives in two unsynced copies:
  `backend/.env` locally *and* Render's own environment. **Both must be edited;
  neither propagates to the other.**
  - **There are exactly two admins, decided by the client on 2026-09-03:**
    `timelessbazzar76@gmail.com` (the shop) and `guptashyamsunder501@gmail.com`.
    The developer's own account was deliberately removed. Do not add a third, or
    re-add the developer, without being asked.
  - Firebase custom claims were built for this the same day and **removed hours
    later at the client's request** — they maintain this alone and wanted one
    mechanism they could reason about, not two. Do not reintroduce them.
- **The Google Sheet is a mirror of MongoDB, never a source.** Nothing in the
  app reads it. Two writes, both fire-and-forget from
  `backend/src/services/sheets.js`: `syncOrderToSheet` when an order is placed,
  `syncOrderStatusToSheet` every time the shop completes/cancels/reopens it. The
  receiving Apps Script **upserts on `Order ID`** and maps by header name — see
  `docs/GOOGLE_SHEET_SYNC.md`. Editing Status in the sheet by hand does nothing
  and gets overwritten. Do not follow the root `GOOGLE_APPS_SCRIPT_UPDATE.md`;
  it is superseded and its script appends duplicate rows.
- Prices: never read `price1kg` / `price500g` directly to decide whether
  something is buyable. Use `isPurchasable(product, size)` from
  `src/data/products.js` — it is the single source of truth.
- Tailwind must stay at 3.4+; 3.2 cannot load this repo's ESM config and fails
  silently by purging every class.

## Current state

Phases 0-4 are done. The storefront and the admin panel at `/admin` both run off
the Express API in `backend/`, backed by MongoDB Atlas. **Firestore is gone** --
Firebase is Auth only.

Phase 5 (the mobile-first UI rebuild) is **in progress**, and the reference
changed on 2026-08-26: it is now a Figma file, not the screen recording --
`Gf926spsJxPbdHA5hkJIyc`, node `1:45`. White throughout, one green accent, no
dark header. Home, Explore, the category grid, product detail, Cart, the
order-accepted screen, Account and the shared components are converted.
Checkout's own steps, Orders, Login and Signup still render the old forest
header and clash. See `docs/PROJECT_LOG.md`.

Running locally needs both: `cd frontend && npm run dev`, and
`cd backend && npm run dev`.
Without the API the shop renders empty.

## Conventions that are easy to trip over

- Money is **integer paise** everywhere server-side and across the API. Convert
  to rupees only for display, via `formatRupees` in `src/lib/api.js`.
- **Fonts are self-hosted in `frontend/public/fonts/`. Never add a Google Fonts
  `@import` or `<link>` back.** Inter (Latin) + Noto Sans Devanagari (the Hindi
  product names -- all 71 have one, and Inter has no Devanagari), both variable
  across 100-900, all gated by `unicode-range` so only ~49 kB loads on a typical
  page. ₹ (U+20B9) lives in its own 2.3 kB file because Google's subsetting puts
  it in Latin Extended, and it appears on every screen. Regeneration commands
  are in `public/fonts/README.md`. Adding a font file means bumping `CACHE_NAME`
  in `public/service-worker.js`.
- Colours come from the semantic tokens only: `surface`, `surface-raised`,
  `surface-sunken`, `line`, `ink`, `ink-muted`, `ink-faint`, `brand`, `forest`,
  `coral`, `cream`. No `gray-*` or `green-*` utilities remain in `src` -- do not
  reintroduce them.
- Animation comes from `src/lib/motion.js`. Do not hand-roll easings.
- `src/data/products.js` is no longer read by the app. It survives only as the
  seed script's source and as the record of the original prices -- editing it
  will not change the shop.
- Auth has exactly one subscription, in `src/context/AuthContext.jsx`. Never
  call `onAuthStateChanged` anywhere else. Guard customer routes with
  `ProtectedRoute` and admin routes with `AdminRoute`, and always wait on
  `loading` before deciding someone is signed out.
- PATCH routes must use
  `validate(schema.partial(), 'body', { onlyProvided: true })`. Without it Zod's
  defaults fire for absent keys and the update wipes fields the caller never
  mentioned -- this silently erased product photos once already.
- A CSS `mask` erases `box-shadow` too. Use `filter: drop-shadow` on a wrapper.
- **Every icon comes from `src/components/icons.jsx`**, and that file is the
  only place allowed to name `@phosphor-icons/react`. Import from it, never from
  the package. Phosphor replaced lucide on 2026-08-28 because it ships six
  weights of every glyph, which is what lets the bottom nav go outline ->
  filled on the active tab; lucide has one weight and could not. The exports
  keep lucide's old *names* (`Search` is Phosphor's `MagnifyingGlass`,
  `ChevronLeft` is `CaretLeft`) so the migration stayed an import swap -- the
  mapping is documented in that file.
  - App-wide weight is `bold`, set once via `IconContext` in `App.jsx`, because
    Phosphor's `regular` is thinner than the 2px lucide the design was matched
    against. Pass `weight="regular"` or `weight="fill"` per icon as needed.
    **Do not pass `strokeWidth`** -- that was lucide's prop and does nothing.
  - `react-icons` survives for brand marks only -- `FcGoogle`, `SiPhonepe`,
    `SiPaytm`, `SiGooglepay`. Phosphor has no logos. Do not use it for UI icons.
- **Icons do not come from Figma.** Exporting glyphs from the design file was
  tried and reverted. Artwork (the carrot mark, the banner) still comes from the
  file.
- Category tile colours come from `src/lib/categoryTints.js`, shared by Home and
  Explore. Do not hardcode a tint in either.
- `ForestHeader` and `ScallopedSeam` belong to the abandoned design. Do not
  reach for them on a screen you are converting -- delete them once the last
  screen is off them.
