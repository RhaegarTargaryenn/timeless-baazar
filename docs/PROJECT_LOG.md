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
- [x] **Phase 1 — Auth fix** ✅ done 2026-08-25
- [ ] **Phase 2 — Backend + MongoDB** ← in progress, PAUSED HERE
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

## Phase 1 — Auth fix ✅

Commit: `4b52cac`

**The diagnosis.** "Login is unreliable" was never Firebase. Header, Checkout
and OrderTracking each ran their own `onAuthStateChanged`. Firebase resolves
those listeners independently, so on a refresh Checkout could conclude nobody
was signed in while the header already knew otherwise — that is how a signed-in
user got thrown to `/login` with a "please login to checkout" toast. Login then
navigated after a bare `setTimeout(300)`, racing the same listeners.

**What was built**

- `src/context/AuthContext.jsx` — the single subscription for the whole app.
  Exposes `user`, `loading`, `isSignedIn`, `isVerified`, `signOut`,
  `refreshUser`, `resendVerificationEmail`.
  *Every consumer must wait on `loading`.* Rendering a logged-out state before
  Firebase has restored the session is the flicker users read as "it logged me
  out".
- `src/components/ProtectedRoute.jsx` — guards `/checkout` and `/track-order`.
  Waits on `loading` before redirecting. The intended destination travels in
  router state, not a `sessionStorage` returnUrl that could outlive an
  abandoned attempt.
- `src/components/VerifyEmailGate.jsx` — the new checkout-time verification
  screen.
- Header, Checkout and OrderTracking now consume the context; their own
  listeners, redirects and `console.log` tracing are gone.

**Verification moved from login to checkout**

- Login no longer signs unverified accounts back out.
- Signup still sends the mail but stays signed in, so people can browse and
  build a cart immediately. The send is best-effort and cannot fail the signup.
- Unverified email/password accounts hit `VerifyEmailGate` at checkout — the
  point where a working email actually matters. It offers resend and re-check.
  `refreshUser()` reloads from Firebase because `user.emailVerified` is a token
  snapshot and keeps reading `false` after the link is clicked otherwise.
- **Google sign-in is now primary** on both pages; email is collapsed behind a
  link. Google accounts arrive verified and never see the gate.
- Forgot-password was a dead button. It sends a reset mail now.

**Tested:** signed-out `/checkout` and `/track-order` both redirect cleanly, no
flash, no error toast, console clean.
**Not tested:** the signed-in path — needs a manual pass with real Google
credentials.

---

## Phase 2 — Backend + MongoDB  ⏸ PAUSED MID-SETUP

Commit: `a021b2a` (scaffold). Infrastructure is up; the API has no routes yet.

### Done

**MongoDB Atlas cluster is live and reachable.**

| | |
|---|---|
| Cluster | `timeless-baazar` — M0 Free, AWS, Mumbai (ap-south-1), 3-node replica set |
| Database | `timeless_baazar` (currently empty, no collections) |
| Server version | MongoDB 8.0.29 |
| Network access | `0.0.0.0/0` — required because Render's free tier has no fixed outbound IP |
| DB user | Auto-created by Atlas during setup. Has Atlas Admin role, which is more than the API needs — worth scoping down later |
| Org / project | `Timeless_bazzar's Org` / `Project 0` |

Two defaults were caught during creation and changed:
- **M10 ($0.08/hour, ~₹5,000/month) was pre-selected.** Switched to Free.
- **"Preload sample dataset" was checked.** That is ~350 MB against a 512 MB
  quota. Unchecked.

**Express API scaffolded** at `server/` — config, auth middleware, error
handling, `/health`. No routes or models yet; those wait on the schema.

`server/src/scripts/checkDb.js` verifies the Atlas connection on its own,
without needing the Firebase credentials. Run it whenever the DB is suspect:

```bash
cd server && node src/scripts/checkDb.js
```

### The DNS workaround — read this before touching MONGODB_URI

This machine's DNS resolver is a link-local IPv6 router address (`fe80::1`)
that refuses SRV lookups, so the normal `mongodb+srv://` string fails with
`querySrv ECONNREFUSED`. **This is local only — Render resolves SRV fine.**

`server/.env` therefore holds the *expanded* form, naming all three shards
directly (`replicaSet=atlas-weghdz-shard-0`, `authSource=admin`). The original
`srv://` string is kept as a comment in that file, and **that is the one to put
in Render's environment**, not the expanded one.

Do not "fix" the expanded URI back to `srv://` locally — it will just break again.

### Also fixed along the way

The connection string was first pasted into the **root** `.env` (the frontend's
file) instead of `server/.env`. It was moved. It happened to be named
`MONGODB_URI` rather than `VITE_MONGODB_URI`, so Vite never exposed it — had it
carried the `VITE_` prefix, the database password would have shipped to every
visitor's browser. Worth remembering: **anything `VITE_`-prefixed is public.**

### ▶ Resume here — exactly where we stopped

`server/.env` still needs two values. Everything else in it is filled in.

1. **`FIREBASE_SERVICE_ACCOUNT`**
   Firebase Console → Project Settings → Service accounts →
   *Generate new private key* → a `.json` downloads.
   Convert it to one line and paste the output after the `=`:
   ```bash
   node -e "console.log(JSON.stringify(require('C:/path/to/key.json')))"
   ```
   Do not commit the `.json` itself — `server/.gitignore` already blocks the
   usual filenames.

2. **`ADMIN_UIDS`**
   Firebase Console → Authentication → Users → copy the User UID.
   Use the developer's own UID while testing; swap in the client's at handoff.

Then:
```bash
cd server && npm run dev
curl http://localhost:4000/health     # expect {"status":"ok","db":"connected"}
```

### Then — the actual Phase 2 work, none of which has started

- **Design the product schema.** This is the decision that matters most in the
  whole rebuild. Today a product only has `price1kg` / `price500g`. A
  Dribbble-grade storefront needs variants, stock, MRP vs selling price, an
  `isActive` flag, and a display order. Get it wrong and both the admin panel
  and the storefront get written twice.
- Mongoose models: Product, Order, Coupon, User.
- Seed script porting the 71 products out of `src/data/products.js`.
  **Decide the "Coming Soon" question first** (see Open questions) — the seed is
  the natural moment to settle it.
- Routes: `/api/products`, `/api/orders`, `/api/coupons`.
- Move the Google Sheets write from the browser to the backend.
- Deploy to Render + keep-alive cron.

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
