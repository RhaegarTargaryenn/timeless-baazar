# Timeless Baazar — Project Log

Running log of the rebuild. **Read this first in a new session.**
Update it at the end of every phase.

Last updated: 2026-08-26

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

## Phase 5, second attempt — the reference changed  2026-08-26

**The forest design is no longer the target.** The client supplied a Figma file
instead of the screen recording:

> https://www.figma.com/design/Gf926spsJxPbdHA5hkJIyc/Online-Groceries-App-UI--Community-?node-id=1-45

That is the "Nectar / Online Groceries App UI" community file, and it is a
different design language from what had been built: white throughout, one green
accent, no dark header, no scalloped seam. Chasing the recording is over — the
Figma is now the source of truth, and it can be read exactly (`get_design_context`)
instead of guessed at from video frames. That removes all three reasons the
previous attempt was slow.

### Done — Home and the shared pieces

Read from node `1:45` and adapted, not pasted.

**Tokens retuned, names unchanged.** `brand-600` is now the design's `#53B175`,
so every existing `bg-brand-600` in the app picked the new action colour up
without being edited; the rest of the scale is derived around it. Semantic
neutrals now hold the design's values -- ink `#181725`, muted `#7C7C7C`, line
`#E2E2E2`, sunken `#F2F3F2`. `borderRadius.card` is 18px. **`body` is white
now**, not `surface-sunken`; sunken is a fill (the search field, the category
tints), not the page.

**`src/components/icons/NectarIcons.jsx`** — the seven glyphs, exported from the
file and inlined with their source viewBoxes. Inlined rather than `<img>`
because the bottom bar recolours the active tab and an `<img>` cannot inherit
`currentColor`. Only the baked-in fills were changed. **They are not all
square** -- Explore is 28.35 x 18.21 and Cart 21.97 x 19.56 -- so each tab
carries its own box; one shared `w-6 h-6` stretched two of them.

**`Home.jsx`** — carrot mark and location, search field, promo banner, then
Exclusive Offer / Best Selling / Groceries. The design's measurements: 25px
gutter, 51.5px field at radius 15, 115px banner at radius 8, 24px titles against
a 16px green "See all", 173px cards at a 15px gap. The three rails are derived
from one catalogue (discounted first, then the rest, no repeats) because the API
has no `featured` flag and nothing is curated yet.

**`ProductCard.jsx`** — 173 x 248 at radius 18, a 1px `#E2E2E2` hairline, no
fill, 15px inset, photo floating on white, then name / unit / price against a
46px green add button. The add button is the design's `rect rx=17 fill #53B175`
rebuilt in CSS rather than shipped as the exported SVG, because it has to morph
into the − 1 + stepper.

**`BottomNav.jsx`** — the floating forest pill is gone. It is the design's
full-width white shelf now: 15px top radius, a wide soft upward shadow, 24px
icons over 12px semibold labels, active tab simply recoloured green.

**`public/design/`** — `logo-carrot.svg` and the two banner artworks, exported
from the file. The icon SVGs were deleted after their paths were inlined, so
nothing unused ships.

### Icons: lucide only

An early pass exported the Figma glyphs and inlined them as
`src/components/icons/NectarIcons.jsx`. **That was the wrong call and it is
gone.** lucide-react is already a dependency and has a clear match for every one
of them. Do not download an icon from Figma again unless lucide genuinely has
nothing like it. Artwork -- the carrot mark, the banner illustrations -- is a
different matter and still comes from the file.

Mapping in use: `Store` Shop, `LayoutGrid` Explore, `ShoppingCart` Cart,
`Receipt` Orders, `Search`, `MapPin`, `ChevronLeft`, `SlidersHorizontal`,
`ChevronDown`, `Heart`, `Minus`, `Plus`.

### Product detail — node `1:682`

`ProductDetailsModal.jsx` repainted to the design, and **full screen**, as the
design draws it. It was first built as a bottom sheet; that squeezed the photo
into a thumbnail and the whole thing read as a cramped popover. It is still an
overlay rather than a route, so closing returns the customer to the exact grid
position they came from, but it now fills the viewport. Portal, Escape and
body-scroll lock survive; drag-to-close went with the sheet.

Inside is the design's: a `#F2F3F2` photo panel with 25px bottom corners, a 24px
bold title over a muted unit line, a −/46px-r17-counter/+ row weighed against a
24px price, hairline disclosure rows, and a 67px brand button at radius 19.

**The design's three rows are Product Detail, Nutritions and Review. Only the
first survives.** The shop stores no nutrition figures and collects no reviews,
so those rows would open onto nothing. **Sizes** takes a slot instead, because a
product here really does have several -- it carries the variant picker, with the
current label in the design's `#EBEBEB` chip.

The photo panel is a snap rail with the design's pagination dots when a product
has more than one image, and a single centred photo when it does not. Dots
follow the rail's scroll rather than driving it, so a swipe and a dot tap cannot
disagree.

### Explore and the category grid — nodes `1:749` and `1:862`

`Products.jsx` is now two screens on one route, chosen by the URL so the back
arrow, a shared link and the browser's own back button all agree:

- **No category and no query** -> "Find Products": centred title, the search
  field, and a two-column grid of tinted category tiles, 189px at radius 18.
- **Anything else** -> the category screen: back arrow, the category's name as
  the title, a filter control, and a two-column grid of the same `ProductCard`
  Home uses, 15px gutters.

The forest header and its filter-chip rail are gone from this page.

The tile colours live in **`src/lib/categoryTints.js`** -- the design's eight
fill/border pairs, cycled. Home's category rail reads the same list, so the two
screens can never disagree about which colour a category is.

**The category images are the shop's own** (`public/category/*`), served through
`category.image` as the API already returns them.

### The category cut-outs

The seeded category images were JPEGs of an illustration on a flat near-white
field, which read as a grey box inside a coloured tile. `mix-blend-multiply`
did not reliably hide it. They are now **keyed to transparency for real**:
`public/category/*.png`, generated by flood-filling inward from the corners so
enclosed light areas inside the illustration stay opaque.
`server/src/scripts/useCategoryCutouts.js` points the stored paths at the PNGs
and is idempotent.

**The same trick does not work on the 71 product photos, and was tried.** Those
are bowls photographed on light grey, and the bowl itself is white and connected
to the background through its rim -- the flood eats the bowl, and at a higher
tolerance the grains too. Cut-out product photography stays a client task.

### Cart — node `1:1015`

`Cart.jsx` rebuilt as the design's list: a centred title over a full-bleed
hairline, then one row per line -- photo left, name with a dismiss X opposite,
unit beneath, and a counter (two 46px r17 bordered boxes around the number)
weighed against the line total. Rows are separated by an inset hairline rather
than drawn as cards; the design reads as a list, not a stack of tiles.

The button is the design's: full width, 67px at radius 19, with the total riding
inside it as a darker `#489E67` chip. It is `sticky` rather than pinned so a
long cart keeps it reachable, and it clears the bottom nav.

**"Clear all" is gone** -- every row now carries its own X, and the old one
opened a `window.confirm`.

### Order accepted — node `1:1820`

`src/components/OrderAccepted.jsx`, rendered by Checkout's success state. It
replaces a dark-forest success screen that no longer belonged to anything.

**Nothing was downloaded for it.** The design's backdrop is a photograph under a
45px blur; it is drawn here as five overlapping radial gradients -- same effect,
no 300 kB image, and it follows the theme. The tick and confetti are authored
too: a disc with an inner hairline ring, lucide's `Check`, seven dots and three
stroked curves, all animated in on a stagger.

The order number is **added, not in the design**: the shop reads orders off the
Google Sheet by number and customers ring up quoting it, so it has to be on
screen.

**Checkout now hides the bottom nav** (`NO_NAV` in `App.jsx`). It is a focused
flow, and on this screen the nav sat directly on top of "Back to home".

### Account — node `1:1258`

A screen this app did not have. `src/pages/Account.jsx` at **`/account`**, behind
`ProtectedRoute`, plus **`/account/addresses`**. The bottom bar is five tabs now:
Shop, Explore, Cart, Orders, Account. The design's fifth is Favourite; this app
has no favourites, so Orders keeps that slot and every tab still goes somewhere
real.

Identity block over a full-bleed hairline, then 18px rows with a 24px glyph and
a chevron, grouped by hairlines, and the design's `#F2F3F2` 67px pill for Log
Out. Google accounts supply `photoURL`; email signups fall back to initials on a
gradient.

**The design's row list is not reproduced verbatim, on purpose:**

| Design row | What happened |
|---|---|
| Orders | -> `/track-order` |
| My Details | Expands in place: name, email, verified state, read-only |
| Delivery Address | -> `/account/addresses` |
| Payment Methods | Expands: cash on delivery, nothing to save |
| Promo Cord | **Dropped.** Coupons are only validated at checkout; the API has no per-customer coupon list |
| Notifecations | **Dropped.** This app sends none |
| Help | Expands: the shop's two numbers as `tel:` links |
| About | Expands: what the shop is, and that prices are recomputed at order time |
| — | **Added: Admin panel**, `isAdmin` only. A real destination the owner needs |

Rows that lead to another screen get a right chevron; rows short enough to sit
here expand, with a chevron that rotates.

`/account/addresses` is only a header around **`AddressManager`**, the same
component Checkout uses -- one component means an address edited here and one
picked at checkout can never drift apart.

### Known gaps

- Product photos still carry their own light-grey field, so each one reads as a
  faint rectangle inside a card and against the detail screen's panel.
- Opening a disclosure row does not scroll it into view, so on a short screen
  the expanded Sizes pills can sit just below the fold.
- **Converted:** Home, Explore, the category grid, product detail, Cart, the
  order-accepted screen and Account. **Still on the forest header:** Checkout's
  own steps, Orders, Login, Signup. Products, Cart, Checkout, Orders, Login and Signup
  still render `ForestHeader` and `ScallopedSeam`, so they are dark green while
  Home is white. They pick up the new palette and the new `ProductCard` and
  `BottomNav`, but the header treatment clashes. **This is the next job.**
  `ForestHeader.jsx` and `ScallopedSeam.jsx` become dead once they are done.
- The design draws five tabs (Shop, Explore, Cart, Favourite, Account). This app
  has four destinations and no favourites or profile screen, so the two that
  would dead-end were left out. Orders borrows the Favourite bookmark glyph --
  there is no orders icon in the source.
- **The photos still fight the layout.** The design uses cut-outs on transparent
  backgrounds; the shop's photos are bowls on a light grey field, so each one
  reads as a grey tile inside the card. Rounding the image box hides the hard
  edge, but the real fix is cut-out product photos, which is a client task.
- Banner copy is ours ("Everyday grocery"), not the source's "Fresh Vegetables /
  40% OFF" -- the shop sells daal, rice and spices and runs no such offer. The
  pagination dots are decorative; there is one promo.
- `mrp` is null on every seeded variant, so no discount badge renders anywhere
  and "Exclusive Offer" is currently just the head of the catalogue.

### Worth knowing for next time

`node --watch src/index.js` crash-loops silently on this machine when started
detached -- it prints `Restarting` forever and never binds :4000. Plain
`node src/index.js` is fine. Use that when the API is needed in the background.

The browser tool's `resize_window` did not take, so screenshots kept coming back
at desktop width and the phone layout was being judged at ~1225px. The reliable
trick is a throwaway `public/__phone.html` holding a 414px-wide iframe of `/` --
Vite serves it, the viewport is exact regardless of the window, and it deletes
cleanly afterwards. `file://` URLs are refused by the tool.

---

## Repo split into frontend/ and backend/  2026-08-26

The frontend used to sit at the repo root with the API tucked into `server/`,
so "the project" and "the storefront" shared a package.json, a node_modules and
a .env. That is now two peer folders:

```
frontend/   was the root -- src, public, index.html, the Vite/Tailwind/PostCSS
            configs, package.json, .env
backend/    was server/ -- unchanged inside
```

Nothing moved *within* either folder, so no import path in `src` changed and no
`backend/src` require changed. Both were verified after the move: the frontend
builds, and the API still connects to Atlas and listens on :4000.

What had to follow the move:

- `netlify.toml` gained `base = "frontend"`. Without it Netlify looks for a
  package.json at the root and finds none. `publish = "build"` is resolved
  relative to `base`, so it stays as it was.
- The root `.gitignore` lost its leading slashes -- `/node_modules` and `/build`
  only ever matched the root. They are now `node_modules/` and
  `frontend/build/`. The separate `server/node_modules` line is gone;
  `backend/` keeps its own .gitignore.
- The stray `*firebase-adminsdk*.json` at the root moved into `backend/`. It is
  a backup only -- the service account the API actually uses is inlined in
  `FIREBASE_SERVICE_ACCOUNT` in `backend/.env`, not read from a file.

**There is deliberately no package.json at the repo root.** A root package.json
would make `npm install` at the root plausible-looking and wrong, and would give
Netlify a second one to get confused by. Every npm command runs inside
`frontend/` or `backend/`.

Older entries below still say `server/` and bare `src/`. They are the record of
what happened at the time; read them as `backend/` and `frontend/src/`.

---

## Resume here

Running locally needs both:

```bash
cd frontend && npm run dev   # storefront
cd backend  && npm run dev   # API on :4000 -- without it the shop is empty
```

**Still to do:**

1. **Convert the remaining screens to the Figma design** — Products, Cart,
   Checkout, Orders, Login, Signup. Home and the shared components are done;
   these still wear the forest header and clash with it.
2. **Cloudinary image upload.** The admin form takes an image *path* today, so
   the client cannot add a product photographed on their phone. This is the last
   gap stopping the panel from being genuinely self-serve.
3. **Deploy the API to Render** plus a keep-alive cron every 14 minutes. Render
   gets the `mongodb+srv://` string kept as a comment in `backend/.env`, **not**
   the expanded one this machine needs. Then set `VITE_API_URL` on Netlify.
4. **Hand over to the client** — their UID into `ADMIN_UIDS`, and a short guide.

Smaller, still outstanding:

- The admin panel has no orders view. The client did not ask for one, but will
  want it once real orders arrive.
- Bulk price update — the most direct cure for the original "iska price bada
  do" problem, and not built.
- `frontend/src/data/products.js` is dead except as the seed's source. Leave it.
- `frontend/src/utils/helpers.js` and `orderNotification.js` are largely unused
  now.

---

## Open questions for the client

1. Should the 29 "Coming Soon" products go live at their listed prices?
2. Does anyone besides the owner need an admin login?
3. Delivery fee / minimum order / tax — any rules? (Needed before Phase 2's schema.)

---

## How to run

Two packages, two installs. There is no package.json at the repo root.

```bash
cd frontend
npm install
cp .env.example .env    # fill in Firebase + Sheets values
npm run dev             # http://localhost:3000
npm run build           # → frontend/build/
```

```bash
cd backend
npm install
cp .env.example .env    # Mongo URI, Firebase service account, ADMIN_UIDS
npm run dev             # API on :4000
```
