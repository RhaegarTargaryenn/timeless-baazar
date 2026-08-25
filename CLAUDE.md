# Timeless Baazar

Grocery storefront PWA for a real shop. React + Vite + Tailwind, Firebase Auth,
deployed to Netlify.

## Read this first

**[docs/PROJECT_LOG.md](docs/PROJECT_LOG.md)** — the running log of an in-progress
rebuild: why we are doing it, decisions already settled, which phase we are on,
and what is deliberately left undone. Start every session there.

## Commands

```bash
npm run dev      # Vite dev server, http://localhost:3000
npm run build    # → build/  (outDir is "build", not "dist", so netlify.toml matches)
npm run preview  # serve the production build
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
the Express API in `server/`, backed by MongoDB Atlas. **Firestore is gone** --
Firebase is Auth only.

Phase 5 (the mobile-first UI rebuild) is **in progress**: design tokens, the
forest layout and the motion system are in place across every screen, but the
visual match against the reference recording is not finished. See
`docs/PROJECT_LOG.md` for what is left and why it has been slow.

Running locally needs both: `npm run dev` here, and `cd server && npm run dev`.
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
