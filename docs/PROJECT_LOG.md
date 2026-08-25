# Timeless Baazar — Project Log

Running log of the rebuild. **Read this first in a new session.**
Update it at the end of every phase.

Last updated: 2026-08-25

---

## Why we are doing this

The client (shop owner) cannot change anything themselves. Every price change
means messaging the developer — *"iska price bada do, iska ye kar do"* — who then
edits `src/data/products.js` and redeploys. This is the root problem: it creates
chaos, and it made the client stop using the app altogether.

Three more problems on top of that:

1. **Login/signup is unreliable.** Not Firebase's fault — the app's own code.
2. **Firestore is not wanted.** Owner wants MongoDB.
3. **UI needs a real rebuild**, mobile-first.
   Reference: https://dribbble.com/shots/22644706-Grocery-Delivery-Mobile-App-UI-Design-for-Shopify-Stores

**The goal: the client edits their own products and prices, on their phone,
without calling anyone.**

---

## Decisions already made (do not re-litigate)

| Area | Decision | Why |
|---|---|---|
| Auth | **Keep Firebase Auth.** Firestore goes, Auth stays. | Firebase Auth ≠ Firestore. Auth is free, has no cold start, and gives Google sign-in + password reset for nothing. Moving auth onto free-tier Render would put a ~50s cold start in front of every login — worse, not better. |
| Database | **MongoDB Atlas M0** (free tier) | Owner's call. Replaces Firestore. |
| Backend | **Node + Express on Render free** | Free tier sleeps after 15 min idle, ~50s cold start. Mitigated by a keep-alive cron ping *and* a client-side product cache so the storefront never blocks on a cold backend. |
| Images | Cloudinary free tier | Admin uploads product photos. |
| Google Sheets | **Keep, one-way, from the backend** | The client reads orders there; that habit stays. Moving the call server-side also fixes the current `mode:'no-cors'` write, which can never detect failure and logs "assumed success". |
| Admin panel | **Same app, `/admin` route**, lazy-loaded, role-gated | Not a separate app (the old Supabase roadmap said separate). Product shape, API client, and design tokens are shared; two repos means every change lands twice. Security comes from the backend role check, not from hiding a URL. |
| Build tool | Vite (was CRA) | `react-scripts` is unmaintained. Done in Phase 0. |
| Admin scope | Products CRUD + price, and coupons/offers | Owner explicitly did **not** pick "view orders" or "bulk price update". Both are easy to add later. Bulk update is the most direct cure for the original pain — worth revisiting. |
| Email verification | **Not required to log in.** Google sign-in is primary; verification is asked for at checkout only. | The old flow blocked login until verified, and the mail usually landed in spam. This is a direct cause of the "unreliable login" complaint. |
| UI rebuild | **Last phase, on purpose** | If the UI is built before the data shape is final (variants, stock, isActive), it gets written twice. |

---

## Where we are

- [x] **Phase 0 — Foundation** ✅ done 2026-08-25
- [ ] **Phase 1 — Auth fix** ← in progress
- [ ] **Phase 2 — Backend + MongoDB**
- [ ] **Phase 3 — Admin panel** ← *this is the phase that solves the real problem*
- [ ] **Phase 4 — Storefront rewired to the API**
- [ ] **Phase 5 — UI rebuild, mobile-first**
- [ ] **Phase 6 — Handoff to client**

---

## Phase 0 — Foundation ✅

Commits: `e576208`, `c912657`, `737ecf2`

- **git initialised.** The project was not under version control at all. First
  commit is a snapshot of the live site, so everything after is reversible.
- **Dead code removed** (~1200 lines, nothing imported any of it):
  `Checkout.backup.jsx`, `Footer`, `CartItem`, `CategorySidebar`, `SearchBar`,
  `InstallPrompt`, `utils/productImages.js`, `public/images/` (a byte-for-byte
  duplicate of `public/Products/`), and an unused `About` in `App.js`.
- **Six bugs fixed** — see `c912657` for the full write-up:
  - `toast.info()` does not exist in react-hot-toast → every successful order
    load threw a TypeError.
  - Two product images had wrong-case paths → work on Windows, 404 on Netlify.
  - `cartStore` mutated the item object when bumping quantity.
  - The `id >= 43` coming-soon rule was copy-pasted across three files.
  - The service worker precached three URLs that do not exist. `cache.addAll`
    is atomic, so the whole precache failed and offline mode never worked.
  - `SKIP_WAITING` was posted to a service worker with no message listener, so
    updates never activated.
- **CRA → Vite.** App chunk 699 kB → 61 kB; vendors split into
  firebase/motion/router so they stay cached across deploys. Build 40s → 13s.
  `build.outDir` stays `build/`, so `netlify.toml` is untouched.
- **Tailwind 3.2.7 → 3.4.** Not planned — found during migration. Tailwind 3.2
  cannot load an ESM config, and once `"type": "module"` was set it silently
  fell back to defaults with an empty `content`, purging every utility class.
  The app rendered completely unstyled. CSS went 6 kB → 57 kB after the fix.
- **Secrets → `.env`** (`VITE_` prefixed), `.env.example` committed.
  `firebase/config.js` now throws at boot if a key is missing.

### Deliberately left alone

- **29 products still show "Coming Soon."** Ids 43+ have real prices in the data
  (Turmeric ₹480, Garam Masala ₹520…) but are force-nulled. The logic is now in
  one place (`isPurchasable()` in `src/data/products.js`) and the behaviour is
  unchanged. **Open question for the client: should these go live?** One-line
  change, but a wrong price live costs them money. Becomes moot in Phase 3 when
  the admin panel owns availability.
- **`AddressManager` writes Firestore sequentially** in a loop when setting a
  default address. Should be a batch — but the file is rewritten in Phase 4.

---

## Open questions for the client

1. Should the 29 "Coming Soon" products go live at their listed prices?
2. Does anyone besides the owner need an admin login?
3. Delivery fee / minimum order / tax — any rules? (Needed before Phase 2's schema.)

---

## How to run

```bash
npm install
cp .env.example .env    # fill in Firebase + Sheets values
npm run dev             # http://localhost:3000
npm run build           # → build/
```
