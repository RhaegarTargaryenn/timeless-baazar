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
- [x] **Phase 2 — Backend + MongoDB** ✅ (Render deploy still pending)
- [x] **Phase 3 — Admin panel** ✅ (image upload still pending)
- [x] **Phase 4 — Storefront rewired to the API** ✅
- [~] **Phase 5 — UI rebuild, mobile-first** ← in progress
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

### Environment is complete and the API boots ✅

`server/.env` is fully populated and the server comes up clean:

```
[db] connected to MongoDB
[api] listening on :4000 (development)

GET /health    -> {"status":"ok","db":"connected"}
GET /api/nope  -> {"error":"No route for GET /api/nope"}
```

The Firebase service account JSON was downloaded to the **project root**. It was
not covered by any ignore rule — a `git add -A` would have committed a private
key that can mint admin tokens for the whole Firebase project. Root `.gitignore`
now blocks `*firebase-adminsdk*.json` and `*serviceAccount*.json`; git history
confirms it was never committed. The key's contents live in `server/.env`, so
**the .json file itself can be deleted or moved out of the repo.**

`ADMIN_UIDS` currently holds the developer's own UID for testing. Swap in the
client's at handoff.

### Phase 5 — UI rebuild  IN PROGRESS

Commits: `2604151`, `3454914`, `9b506d8`, `0215c53`, `5508081`

Reference: a screen recording of a Dribbble grocery-app mockup, on the Desktop
as `Recording 2026-08-25 205055.mp4`. Frames come out with OpenCV (`cv2`) —
ffmpeg is not installed on this machine.

### Done

**Design tokens.** `tailwind.config.js` + `src/index.css` hold one system:
semantic surfaces (`surface`, `surface-raised`, `surface-sunken`, `line`, `ink`,
`ink-muted`, `ink-faint`) driven by CSS variables, plus `brand`, `forest`,
`coral`, `cream`. **Every hardcoded `gray-*` / `green-*` utility is gone from
`src`.** The stylesheet went 62 kB to 38 kB.

Before this, two half-systems were fighting: a green palette in the config and
orange left over in several components, plus `shadow-soft*` in the config and
`shadow-smooth*` redefined again in the CSS.

**The forest layout.** `ForestHeader` paints the dark band; content sits on it
as a white sheet. `ScallopedSeam` draws the wavy join as a CSS mask that tiles
at a fixed 56px — an earlier version stretched a fixed number of arcs across
the width, so tight scallops on a phone became huge waves on a desktop.

**Motion.** `src/lib/motion.js` holds one easing and three springs, so the app
moves with a single personality. Shared-element transitions via `layoutId` for
the nav disc, size selector and filter underline — one object moving, not
several crossfading. Grid stagger is capped; with 71 products an uncapped one
leaves the last card arriving seconds after the first.

**Every screen converted:** Home, Products, Cart, Checkout, Orders, Login,
Signup, VerifyEmailGate, the install prompt, and the whole admin panel.

Not only repainted:
- Checkout went from three steps to two — the first re-listed the cart, which
  is its own page now.
- Cart became a real page instead of a redirect to checkout.
- Orders replaced "type your order number" with the customer's own order list
  and a status trail.
- The bottom nav is a floating pill; labels were dropped because they made it
  wide enough to cover the product cards behind it.

### Reverted

`bfcf63b` added a scalloped bottom edge to product cards; reverted in
`5508081`. Worth remembering if it is attempted again: a CSS mask erases
`box-shadow` along with everything else outside the shape, so the shadow has to
move to a wrapper as `filter: drop-shadow`, which follows the alpha channel.

### Honest state

Layout, tokens and motion are in place, but **the design does not match the
reference closely yet**, and getting this far took several rounds of
screenshot-and-correct. Three reasons, worth knowing before picking it up:

1. The reference is a *video of a rendered mockup*, not a design file. Colour
   and layout read fine from frames; exact spacing, radii, type sizes and the
   precise green do not.
2. The browser tool returns screenshots at whatever size the window happens to
   be, often desktop width — so a phone design keeps being judged at 1568px.
3. The mockup uses cut-out illustrations on transparent backgrounds; the shop's
   photos are bowls on near-white. The same layout reads differently.

Fastest loop found: the developer sends a screenshot from an iPhone SE viewport
and names the single thing that looks most wrong.

---

## Resume here

Running locally needs both:

```bash
npm run dev                  # storefront
cd server && npm run dev     # API on :4000 -- without it the shop is empty
```

**Still to do:**

1. **Finish the visual match** on Phase 5, screen by screen, against the
   recording.
2. **Cloudinary image upload.** The admin form takes an image *path* today, so
   the client cannot add a product photographed on their phone. This is the last
   gap stopping the panel from being genuinely self-serve.
3. **Deploy the API to Render** plus a keep-alive cron every 14 minutes. Render
   gets the `mongodb+srv://` string kept as a comment in `server/.env`, **not**
   the expanded one this machine needs. Then set `VITE_API_URL` on Netlify.
4. **Hand over to the client** — their UID into `ADMIN_UIDS`, and a short guide.

Smaller, still outstanding:

- The admin panel has no orders view. The client did not ask for one, but will
  want it once real orders arrive.
- Bulk price update — the most direct cure for the original "iska price bada
  do" problem, and not built.
- `src/data/products.js` is dead except as the seed's source. Leave it.
- `src/utils/helpers.js` and `orderNotification.js` are largely unused now.

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
