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

Phases 0 (foundation) and 1 (auth) are done. Phase 2 (backend + MongoDB) is next.

Products are still hardcoded in `src/data/products.js` and orders still go to
Firestore — both move to a MongoDB-backed API in Phases 2–4. Do not build on the
assumption that either is permanent.

Auth has exactly one subscription, in `src/context/AuthContext.jsx`. Never call
`onAuthStateChanged` anywhere else — several components each having their own is
what made login unreliable in the first place. Guard routes with
`ProtectedRoute`, and always wait on `loading` before deciding someone is signed
out.
