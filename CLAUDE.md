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
```

## Conventions

- Components live in `src/components`, routed pages in `src/pages`. JSX files
  must use the `.jsx` extension — Vite will not parse JSX out of `.js`.
- The package is ESM (`"type": "module"`), so config files use `export default`.
- Env vars need the `VITE_` prefix and are read via `import.meta.env`.
  `process.env` does not exist in this app.
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
- **Icons come from lucide-react, not Figma.** Exporting glyphs from the design
  file was tried and reverted -- lucide matches every one. Artwork (the carrot
  mark, the banner) still comes from the file.
- Category tile colours come from `src/lib/categoryTints.js`, shared by Home and
  Explore. Do not hardcode a tint in either.
- `ForestHeader` and `ScallopedSeam` belong to the abandoned design. Do not
  reach for them on a screen you are converting -- delete them once the last
  screen is off them.
