# Timeless Baazar — Project Log

Running log of the rebuild. **Read this first in a new session.**
Update it at the end of every phase.

Last updated: 2026-09-03

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

## Native-feel polish pass  2026-08-28

Not a phase. The complaint was that the app reads as "good, but not
professional" next to a real mobile app -- flat icons, animation that is fine
but not app-grade. The diagnosis was that almost none of the gap was a missing
library. **Nothing was installed.**

Three things were already in place and were left alone: `BottomNav` is already
glass (translucent, `backdrop-blur-xl`, `backdrop-saturate-150`, with an opaque
`supports` fallback), the storefront already uses skeletons on Home, Products
and Orders, and `lib/motion.js` already holds one easing and three springs.

### Haptics -- `src/lib/haptics.js`

New, and the biggest single win here. Six patterns on a deliberate ladder:
`tap` 8ms, `select` 12ms, `impact` 18ms, then `success` / `warning` / `error`
as short arrays. All much shorter than the Vibration API's own examples, which
are written for notifications -- past ~25ms it stops reading as a click and
starts reading as the phone buzzing *at* you.

**Android only, and that is not a bug.** iOS Safari does not implement the
Vibration API; there is no polyfill and no permission to request. Every call is
a silent no-op on an iPhone. Do not "fix" this -- it needs a native wrapper.

Guards inside the module so no call site ever checks anything: support detected
once at load, `document.hidden` skipped (a backgrounded tab must not buzz a
pocket), a 40ms floor so a held stepper button stutters instead of turning the
motor into a continuous rattle, a persisted `localStorage` opt-out read once
into a flag (these fire per tap; a synchronous storage read per tap is a real
cost on a cheap phone), and a try/catch because some Android browsers throw
rather than return false without user activation.

**The cart's haptics fire from `cartStore`, not from the buttons.** Adding to
the cart happens from the card, the detail sheet and the cart page's own
stepper; putting the buzz on the action means all three feel identical, a
fourth call site cannot forget, and the feedback tracks what actually happened
-- `addItem` rejects an inactive variant and the rejected add correctly stays
silent. `clearCart` is deliberately silent: it runs on a successful order, and
Checkout already fires `success` there.

### Touch behaviour -- `index.css`

`touch-action: manipulation` on every interactive element. This drops the
~300ms wait mobile browsers hold after a tap in case a second one means "zoom".
**Every button in the app was answering a third of a second late**, and that
delay was most of what read as sluggish -- not the animations.

Also: `overscroll-behavior-y: contain` on body, so flicking past the end of a
list no longer hands the gesture to the browser (iOS rubber-banding the whole
page away, Android arming pull-to-refresh, which reloads the app mid-shop).
`contain` and not `none` -- `none` would also kill the bounce customers use to
confirm they have hit the bottom. `-webkit-text-size-adjust: 100%`, because iOS
inflates text on rotate and that breaks the product card's fixed heights. And
`-webkit-touch-callout` / `user-select: none` on buttons and images only, so a
long press does not offer to save a product photo or smear a selection
highlight across a label -- **text is untouched**, a customer copying an order
number must still be able to.

### Elevation -- `tailwind.config.js`

Every shadow rebuilt as three stacked layers: a 1px barely-blurred **contact**
layer (the darkest, and the one that actually sells the depth -- leaving it out
is why most CSS shadows look like fog), a mid **direct** cast, and a wide faint
**ambient**. Alpha roughly halves as blur roughly doubles, so falloff is smooth
rather than banded. Colour is `16 24 40`, a desaturated navy: pure black over a
warm white page goes muddy. `shadow-brand` is tinted with its own green, since
a neutral shadow under a saturated fill reads as dirt.

Names are unchanged, so nothing referencing `shadow-card` / `lift` / `sheet` /
`brand` / `float` / `shelf` needed editing. One added: **`shadow-press`**, the
contact layer alone, on `Button`'s `active:` state -- a button that shrinks
*and* drops toward the page reads as pushed, where scale alone reads as merely
smaller. `Button`'s transition had to widen from `transition-colors` to include
`box-shadow` or the drop snapped.

### The last two spinners

`PageSkeleton` in `components/ui`, now used by `App.jsx`'s Suspense fallback
and `ProtectedRoute`. Deliberately generic -- it stands in for Home, Cart,
Orders and Checkout alike, so it commits to nothing beyond a title, a wide
block and four rows that fade out down the list. Guessing a layout and guessing
wrong is worse than not guessing: the content lands and visibly rearranges.
`Skeleton` now forwards extra props so the per-row opacity can reach it.

Spinners that remain are all in the admin panel plus in-button `Loader2`s. Both
are fine: a spinner inside a button that is already on screen is not the thing
that reads as a web page.

### Not done, and why

- **Icon depth.** The recommendation was `@phosphor-icons/react`, whose icons
  ship in six weights -- inactive `regular`, active `fill` is the iOS tab bar,
  and it is the single clearest remaining tell that these are website icons.
  Not done because it swaps every icon in the app and wants its own pass.
- **Rive** (`@rive-app/react-canvas`) for genuinely animated tab icons. State
  machines beat Lottie timelines here and the runtime is far smaller, but
  someone has to author the `.riv` files. Worth it for five tabs, not for the
  whole app.
- **Gesture-driven motion** (`@use-gesture/react`) to bring drag-to-close back
  to `ProductDetailsModal` properly -- tracking the finger 1:1 and flinging on
  release velocity. This is the deepest remaining difference from native, and
  the largest job.
- Smooth-scroll libraries (`lenis` and friends) were considered and rejected:
  on a phone they replace native momentum scrolling with a JS approximation and
  feel worse.

### Verified

`npm run build` clean. Confirmed in the emitted CSS: `touch-action:manipulation`,
`overscroll-behavior-y:contain`, `text-size-adjust:100%` and the
`active:shadow-press` rule are all present.

**Not verified on a real phone.** The haptics cannot be tested on this laptop
at all, and `backdrop-filter` over a scrolling grid is a known jank source on
mid-range Android -- the bottom nav sits over the product grid, which is the
worst case. Both need a pass on a cheap Android handset.

---

## Icons: lucide -> Phosphor  2026-08-28

The follow-on to the polish pass, and the item that pass listed as the biggest
remaining tell. **`@phosphor-icons/react` is the only dependency added; lucide
is uninstalled.**

### Why

lucide is a single 2px outline weight. That is a good *website* icon set, and it
was exactly what made the app read as a website: a native tab bar does not
merely recolour the selected icon, it fills it. Phosphor ships every glyph in
six weights from one package, so outline-inactive / filled-active is a prop
change rather than two icon sets bolted together.

### `src/components/icons.jsx`

Every icon in the storefront and the admin panel now comes from this one file,
and it is the only place that names the icon package. Swapping sets again is one
edit rather than twenty-five.

**The exports keep lucide's names on purpose.** `Search` is Phosphor's
`MagnifyingGlass`, `ChevronLeft` is `CaretLeft`, `Trash2` is `Trash`,
`Loader2` is `CircleNotch`. That made the migration an import swap in each file
instead of a rewrite of every call site, and the full mapping is documented in
the module. Read those names as this app's vocabulary, not as a claim about
Phosphor's.

Two glyphs have no equivalent and fall back deliberately: lucide's `PackageX`
and `SearchX` become the plain `Package` and `MagnifyingGlass`. Both appear only
in empty states whose heading already says nothing was found, so the crossed-out
detail carried no information the customer did not have. `MailCheck` becomes a
plain `EnvelopeSimple` -- Phosphor's `SealCheck` reads as "verified account",
not "check your mail".

### Weight

App-wide default is **`bold`**, set once through `IconContext` in `App.jsx`.
Phosphor's `regular` is roughly a 1.5px stroke where lucide was a flat 2px, so
defaulting to regular would have made every screen abruptly lighter than the
design it was matched against. `size="1em"` is set alongside it so icons inherit
their container's font size and the Tailwind `w-*` / `h-*` classes already on
every call site stayed in charge -- nothing had to be resized.

The 28 `strokeWidth` props are gone; that was lucide's prop and Phosphor ignores
it. Three were deliberate lightness and became `weight="regular"` (the Account
rows, the detail sheet's Heart) or `weight={isActive ? 'fill' : 'regular'}` (the
admin sidebar). **The confetti in `OrderAccepted` kept its `strokeWidth="4.5"`**
-- those are hand-authored `<motion.path>`s, not icons, and the strip was
scoped to the brace form to spare them.

### The bottom nav

Each tab renders the glyph twice, stacked: `regular` underneath, `fill` on top
at opacity 0, crossfading in with a slight scale-up on `spring.snappy`. A bare
weight swap is a single-frame pop and at 22px reads as a glitch; this reads as
the icon inflating. `initial={false}` so the tab that is already active on first
paint is simply solid rather than animating on every mount.

### A third icon set, removed

Login and Signup were drawing their field icons from `react-icons/hi`
(Heroicons) -- a third set in the same app, and part of why those two screens
never quite matched. Those six are now the app's own.

`react-icons` stays in `package.json` **for brand marks only**: `FcGoogle`,
`SiPhonepe`, `SiPaytm`, `SiGooglepay`. Phosphor has no logos and never will.

### The cost, measured

Not free, and worth knowing before adding more icons:

| | before | after | delta |
|---|---|---|---|
| all JS, raw | 585.0 kB | 700.8 kB | +115.8 kB |
| all JS, gzip | 198.8 kB | 230.2 kB | **+31.4 kB (16%)** |
| clean build | ~37 s | ~30-100 s | slower, noisy |

**Why it is not as bad as 16% sounds:** that is every chunk summed, and no
route loads them all. The first paint on Home (index + Home + ProductCard) goes
from roughly 30 kB gzip to roughly 40 kB -- about **+10 kB gzip on first load**,
once, then cached.

**Where the weight comes from:** a Phosphor icon component embeds the path data
for all six weights, so the ~47 icons that use exactly one weight still pay the
six-weight tax. Only the five nav glyphs actually spend it. That is the trade,
and it was made knowingly for a consistent set; if the bundle ever needs
clawing back, the honest lever is putting Phosphor in `BottomNav` alone and
something single-weight everywhere else -- at the price of two sets again.

### Verified

`npm run build` clean. All 54 exports in `icons.jsx` were loaded in Node and
confirmed to resolve to real components with a usable `IconContext` -- a typo in
a re-export name is the one failure this migration could plausibly have
introduced, and it would not have shown up until that screen was opened.

**Not verified in a browser.** Nothing here was looked at running. The weight
and optical size of Phosphor against this design is a judgement call that needs
eyes on a phone, and `weight="bold"` is a starting point, not a measured
choice -- if the app now reads heavy, that one constant in `App.jsx` is the dial.

---

## Orders for the shop, and two statuses  2026-08-28

The admin panel can now read and close orders, and the six-stage order
lifecycle is two stages.

### Six statuses became two

`ORDER_STATUSES` is `['placed', 'completed']`. It was pending / confirmed /
packed / out_for_delivery / delivered / cancelled -- a courier company's
lifecycle, on a shop that has no courier, no warehouse and no packing desk.
Nobody was ever going to stand at the counter tapping an order through four
intermediate stages, so **every order in the database was sitting on `pending`
and the customer's five-stage trail was decorative** -- four greyed-out stages
that would never light up, which reads as an order that has been forgotten.

Two states are two the shop will actually keep honest.

**There is no `cancelled`, and that is a real gap.** A wrong, duplicate or test
order can only be marked completed, which is a lie the shop has to live with.
Adding a third status is the fix; the places that would need to know are the
enum in `models/Order.js`, the customer's trail in `OrderTracking.jsx`, the
admin filter pills, and the two coupon-usage counts described below. Flagged
rather than decided, because two states is what was asked for.

Both directions are allowed on the status route on purpose. Completing is one
tap done one-handed at a counter, so mis-taps are a question of when, not
whether; one-way would make a database edit the only fix for a slip.

### The migration

`backend/src/scripts/migrateOrderStatuses.js`, wired to `npm run migrate-orders`.
Idempotent -- verified by running it twice.

```
[migrate] before: [{"_id":"pending","n":9}]
[migrate] pending -> placed: 9
[migrate] after:  [{"_id":"placed","n":9}]
[migrate] 9 statuses, 9 trails rewritten
```

It rewrites `statusHistory` with the same mapping, collapsing consecutive
duplicates -- four pre-delivery stages all becoming `placed` would otherwise
draw the same row four times on the customer's screen. It goes through the raw
collection rather than the model, because the model's enum no longer contains
the values it has to read.

`cancelled` maps to `completed` **only** because the database had zero
cancelled orders. The script warns loudly if it ever converts one, and that
warning means stop.

### Two dead coupon filters

`routes/orders.js` and `routes/coupons.js` both counted a customer's past uses
of a coupon with `status: { $ne: 'cancelled' }`. With no cancelled status that
filter can only ever match nothing, so it was removed rather than left implying
a carve-out that does not exist. Both sites carry a comment pointing at the
other, since they must stay in step.

### `GET /orders/admin/all` returns counts

Every status, plus `all`, from one grouped aggregation over the collection --
not derived from the returned page. The filter pills each carry a number, and
deriving those from a page would count the fifty orders on screen rather than
the whole book the moment there is more than one page.

### `AdminOrders.jsx` -- new, at `/admin/orders`

Built around what the client's routine actually needs -- **who to call** and
**what to put in the bag** -- because this screen is meant to replace reading
orders off the Google Sheet.

- The phone number is a `tel:` link. Ringing the customer is the most common
  thing done with an order; making them copy a number out of a sheet is the
  friction this screen exists to remove.
- Status is a **coloured left edge**, not a corner badge. The client scans a
  column of these for the ones still to do, and an edge reads at a glance.
- Collapsed answers who / when / how much / how many. Expanded lists items,
  address and totals. The primary action is reachable without opening anything.
- Money rows only render when they carry information -- no `₹0 discount` line
  on every order.
- Marking done updates in place and adjusts the counts locally rather than
  refetching: a refetch reorders the list the instant they tap, which on a phone
  means the next row jumps into where their thumb already is.
- Default filter is **To do**, not All.

### Admin nav

`Orders` added, and put **first** -- it is the only admin screen with a customer
waiting at the other end. `/admin` now lands there instead of Products.

Three tabs did not fit the phone pill: at the old fixed width they came to
roughly 354px before the outer padding, on a 375px screen. **Only the selected
tab carries its label now**, with the label itself animating its width so the
white pill stays one continuous shape. Both platforms use this pattern for
exactly this reason. The desktop row picked up `weight="fill"` on the active tab
to match the storefront.

### `AdminProducts` -- the filter rebuilt

The old screen ran visibility and category as **one** long scrolling row with a
divider between them, so two unrelated questions looked like a single list and
the category pills were usually off-screen.

Now it is two levels. The primary cut -- on the shop or not -- is a fixed
three-up segmented control that is always fully visible. Categories sit under it
as a scrolling row, **and their counts follow whatever the row above is set
to**: switch to "Hidden" and each category shows how many hidden products it
holds. That is what makes the two rows one control rather than two. Categories
that would be empty under the current filter are dropped, unless selected.

Also: a responsive `md:grid-cols-2` (these cards are fixed-height and ~400px
wide, so one column wasted most of a tablet or laptop screen and made the client
scroll 71 products one at a time), skeletons instead of the spinner, a "showing
N of M" line, and an empty state with a Clear filters button.

### Verified

- Migration run, and re-run to prove idempotence.
- API restarted on the new code and boots clean; `/health` ok.
- `/orders/admin/all` and the status PATCH both 401 unauthenticated.
- The counts aggregation was run directly against the database:
  `{"placed":9,"completed":0,"all":9}`. The model rejects `delivered` and
  accepts `completed`.
- `npm run build` clean; `AdminOrders` emits its own chunk.

**Not verified in a browser, and this is the gap that matters here.** Nothing on
these screens has been clicked. The admin endpoints need a real admin token,
so **"Mark done" has never actually round-tripped** -- the request shape is
right by inspection and the handler logic was proven against the database, but
the button itself is untested. Worth doing first with the client's own login.

---

## Cancellation added back  2026-08-28

The previous entry called the missing cancel a known gap. The client asked for
it, and it should not have shipped without it. `ORDER_STATUSES` is now
`['placed', 'completed', 'cancelled']`.

**`cancelled` is an end state beside `completed`, never a stage on the way to
it.** Nothing draws the three as a progress bar -- the customer's screen swaps
the trail for a panel, and the admin card swaps its accent instead of advancing
anything.

### The real reason it had to exist

Not tidiness. Without a cancel, the only way to void a wrong or duplicate order
was to mark it completed -- and both coupon-usage counts treat a completed order
as a use. **Voiding an order silently burned the customer's one use of a coupon
for an order that never happened**, and they would be told the code was already
used with no way to see why.

So the `status: { $ne: 'cancelled' }` guard is back in both
`routes/orders.js` and `routes/coupons.js`, each commented pointing at the
other. It was removed as dead code in the previous entry, which was correct at
the time and wrong an hour later. Reopening a cancelled order therefore also
hands the customer their coupon use back, for free.

`LEGACY_STATUS_MAP.cancelled` is the identity again rather than folding into
`completed`. The migration now leaves cancelled orders alone, and the loud
warning it carried is moot.

### Where the cancel control lives

**Not on the collapsed card.** Marking done happens constantly and stays one tap
on the row; cancelling is rare and writes off a customer's order, so it sits
behind opening the card *and* behind a confirm. The confirm is inline -- the
button row swaps for "Cancel this order?" with No / Yes -- not `window.confirm`,
which is what the old Cart "Clear all" used and was removed for.

Cancelled rows get a coral edge, a struck-through customer name and 70% opacity:
the one kind of row that should never draw the eye. The primary button becomes
Reopen, so a mis-tap is one tap to undo.

`handleChanged` no longer assumes a two-way toggle. It decrements whichever
bucket the order left and increments the one it joined, because with three
statuses an order can go from cancelled straight back to placed. The filter row
is four pills now, so it lost a point of type size and gained `truncate`.

### Verified -- and this time by the client, in the real app

The previous entry's open caveat was that "Mark done" had never round-tripped,
because the admin endpoints need a token this machine cannot mint. **The client
exercised all three transitions while this was being written**, and the
`statusHistory` on `TB-2808-0005` is the proof:

```
10:13  placed      Order placed
11:18  completed   Completed by shop     <- Mark done
11:19  placed      Reopened by shop      <- Reopen
11:22  cancelled   Cancelled by shop     <- Cancel
```

The notes match the strings in `AdminOrders.jsx` exactly, so the request shape,
the auth, the enum and the history push are all confirmed end to end. Their
`npm run dev` runs `node --watch`, so editing `Order.js` restarted their API and
the new status was live without anyone doing anything.

Also checked directly against the database: the model accepts all three statuses
and still rejects `delivered`; the counts payload reads
`{"placed":8,"completed":0,"cancelled":1,"all":9}`. `npm run build` clean.

**Still unverified:** the customer-facing cancelled panel in `OrderTracking.jsx`.
Order `TB-2808-0005` is cancelled and belongs to `timelessbazzar76@gmail.com`, so
opening Orders on that account is the one-step check.

### Admin access

`ADMIN_UIDS` in `backend/.env` now holds two uids -- the developer's
(`yunU3Ob...`) and the shop's (`Ad0tpBO...`, `timelessbazzar76@gmail.com`). The
panel was invisible to the client because only the first was listed; nothing was
broken in the code. **Render needs the same value set in its own environment**,
or the shop account will be admin locally and not in production.

---

## Typography rebuilt  2026-08-28

The brief was "find the industry best and implement it". The interesting part
was not Inter -- that stays -- it was **how** it was being loaded, and a gap
nobody had noticed.

### The gap: 71 products, 71 Hindi names, no Devanagari font

**Every one of the shop's 71 products has a `nameHindi`, and all 71 are real
Devanagari.** Inter contains no Devanagari whatsoever, so all of it was
rendering in whatever the operating system happened to supply -- Nirmala UI on
Windows, Devanagari Sangam MN on iOS, something else on Android. Three devices,
three different-looking shops, none of them matching the Latin text beside them.

**Noto Sans Devanagari** now covers it: one face everywhere, drawn to sit next
to a neo-grotesque. It is gated behind `unicode-range`, so it is fetched only
when a Devanagari character is actually painted -- it costs nothing on a screen
with no Hindi on it.

### The loading was the worst case

`index.css` opened with `@import url('https://fonts.googleapis.com/...')`. An
`@import` is not discovered until the stylesheet containing it has been
downloaded and parsed, so the chain ran **HTML -> CSS -> Google's CSS -> the
font file**: four serialised round trips, two to third-party origins each
needing their own DNS and TLS, before a word could render in the right face.

Self-hosted now, one hop, with `<link rel="preload">` in `index.html` so the
request starts while the HTML is still parsing rather than after the CSS lands.
`crossorigin` on the preload is not optional -- fonts are fetched in CORS mode
even same-origin, and without it the preload is ignored and the file downloads
twice.

The old case for the CDN -- a visitor might already hold Inter cached from
another site -- **has not been true since browsers partitioned the HTTP cache by
top-level site in 2020**. Self-hosting also stops handing visitor IPs to a third
party on every page load.

### Variable, not five static cuts

The old import asked for `wght@400;500;600;700;800` -- five files, five
requests, and a silent cap: any weight outside those five was synthesised by the
browser. Every file here is variable across 100-900.

### The rupee sign, which turned out to matter

₹ is U+20B9, and Google's subsetting puts it in **Latin Extended, not Latin**.
So the shop would have pulled an 85 kB file to draw one glyph -- a glyph on
every price on every screen, so it could never be lazy.

Subsetted to exactly that character it is **2,316 bytes**. Google's own API does
the subsetting server-side (`&text=%E2%82%B9`), so no local `fonttools` was
needed. The full Latin Extended file is still shipped as a safety net for
accented text, with U+20B9 carved out of its `unicode-range` so the tiny file
wins and the big one stays asleep.

### What actually loads

| | |
|---|---|
| Eager, every page | **49.4 kB** -- `inter-latin` (48 kB) + `inter-rupee` (2.3 kB) |
| Lazy, on demand | 201 kB -- Devanagari (121 kB) when Hindi paints, Latin Ext (85 kB) if an accent ever appears |

Against the old setup that is fewer requests, no third-party origins, no
render-blocking `@import`, the full weight axis, and Devanagari that finally
looks the same on every phone.

### Layout shift

`font-display: swap` shows text immediately and swaps when Inter lands, which
normally reflows the page because Arial sets wider and shorter. An
`Inter Fallback` face with `size-adjust` / `ascent-override` /
`descent-override` stretches the fallback to occupy the same box, so the swap
changes letterforms and nothing else. **The numbers are the published
Inter-on-Arial values** (the ones `next/font` generates), not measured from this
exact file -- regenerate with `fontaine` or `capsize` if the font is replaced.

### Everything else that had to follow

- `tailwind.config.js` font stack is `Inter, Noto Sans Devanagari, Inter
  Fallback, ...`. Font fallback resolves per character, so "Arhar Dal /
  अरहर दाल" takes each half from the face that has the glyphs.
- `netlify.toml` caches `/fonts/*` immutably for a year. Safe because filenames
  are stable and files are never edited in place.
- **Service worker bumped to `v3`.** The two eager fonts joined the precache
  (guaranteed present -- they are copied verbatim from `public/`), and its
  comment claiming fonts are cross-origin was corrected: they are same-origin
  now, so the cache-first handler picks them up. Bumping the name makes
  `activate` drop the v2 cache rather than leaving people on the old shell.
- `public/fonts/README.md` records the OFL-1.1 licensing for both families and
  the exact `curl` commands to regenerate every subset.

### Verified

`npm run build` clean. The build contains all four `.woff2` files, the CSS
references all four by absolute path, both preloads are in `index.html`, and
**no reference to `fonts.googleapis.com` or `fonts.gstatic.com` survives
anywhere in the output**.

**Not verified in a browser**, as with the rest of this session: nobody has
watched the Devanagari actually render. Opening any product with a Hindi name is
the one-step check.

---

## Order-accepted screen: the real artwork  2026-08-28

The screen and both buttons were already there from the earlier pass. What was
wrong was the picture: the tick and confetti had been **hand-authored** before
the asset existed -- circles, dots and two invented curves that approximated the
Figma frame. The client supplied `Group 6872.svg`, so the approximation is gone.

**Inlined, not `<img>`.** Every piece animates on its own -- the disc springs in
on `spring.sheet`, the tick lands a beat later so it reads as confirmation
rather than decoration, the three ribbons draw themselves with `pathLength`, and
the seven dots pop on a stagger. None of that is reachable through an image tag,
and the app already had this motion; losing it to gain a file would have been a
downgrade.

Details worth keeping:

- The file's last dot is written as a **mirrored** circle,
  `matrix(-1 0 0 1 161.739 220)`. Resolved to a plain centre (157.70357,
  224.03543) so every dot animates through the same code path.
- SVG elements scale about the viewBox origin by default, so a corner dot flew
  in from across the artboard. `transformBox: fill-box` +
  `transformOrigin: center` makes each one pop where it sits.
- Figma's filter id (`filter0_d_1_1832`) renamed to something readable.
- `stroke` dots are rings and `fill` dots are solid; the design uses both and
  they are not interchangeable.
- The real composition is **asymmetric** in a way the approximation was not: the
  disc sits right of centre (158.82 of 273) with the confetti weighted to the
  lower left. Rendering the file's own viewBox preserves that.

The design's body copy reads "Your items has been placcd and is on it's way" --
kept corrected in the app rather than reproduced.

### Verified

Every `d`, every circle's cx/cy/r, every hex colour, the viewBox, the filter and
the ring's stroke opacity were diffed programmatically against the source file:
all match. `npm run build` clean.

**Not seen rendering.** The geometry is provably the designer's, but nobody has
watched it animate.

---

## The success screen was never reachable  2026-08-28

The client reported that placing an order showed only a toast. It was not the
artwork and not the screen -- **`OrderAccepted` was mounting and being
navigated away from in the same instant.**

### The bug

Checkout guards against an empty cart:

```js
if (items.length === 0 && !orderNumber) navigate('/cart', { replace: true });
```

Placing an order empties the cart, so the guard had to know an order had just
been placed. It learned that from `orderNumber` -- and that is the bug, because
the two updates land in **different React lanes**:

- `clearCart()` is a Zustand write, which reaches React through
  `useSyncExternalStore` at **sync** priority.
- `setOrderNumber()` is ordinary state at **default** priority.

Sync wins. There is one render in between where the cart is already empty and
`orderNumber` is still `''`. The effect fired in that gap and replaced the route
with `/cart` before the success screen could paint. The order was created, the
success toast fired from the app-level `<Toaster>` and survived the navigation,
and the customer landed on an empty cart having never seen the screen. Exactly
"only a toast".

**The fix is a ref**, written synchronously before `clearCart()`, so the
in-between render already sees it and there is no gap to race.

### Why it took two attempts

The first fix looked like it had not worked. It had -- **the app was not being
served by the dev server at all.** Port 3000 was running

```
vite preview --port 3000
```

which serves the static `frontend/build/` directory. Source edits do not appear
there until `npm run build` is re-run, and the build on disk predated the fix.
That also explains the client's "vo asset nhi kia": the new order-accepted
artwork *was* committed, but the build they were clicking through was older than
it, and the race meant they never reached the screen either way.

Worth remembering: **if changes are not showing up, check whether :3000 is
`npm run dev` or `npm run preview`.** They look identical in the browser.

### Verified in a browser, properly

Full order placed through the UI on a fresh build. The success screen renders:
the designer's disc and inner ring, the tick, all three ribbons, all seven
confetti dots, the headline, the order number (`TB-2808-0013`), the green
**Track Order** pill and the plain **Back to home** beneath it.

Also confirmed in passing: **the Devanagari renders** -- the cart showed
"मिक्स पापड़" in Noto Sans Devanagari -- and the Phosphor tab icons and product
cards all draw correctly.

---

## The deployed shop was pointing at localhost  2026-08-28

The client deployed both halves and the shop would not load. Nothing was down:

- Render API: `200`, `{"status":"ok","db":"connected"}`, `/api/products` `200`.
  **The URL had not changed.**
- CORS on Render: a preflight from `https://timelessbazzar.netlify.app` came
  back with `access-control-allow-origin` set to exactly that. Fine.
- Netlify: `200`, and serving the *current* build.

The fault was in the bundle. `VITE_API_URL` had not been applied, so
`src/lib/api.js` fell back to its `http://localhost:4000` default and the
deployed shop was calling a machine that only exists on a developer's laptop.
Every visitor got an empty catalogue.

**The giveaway:** the entry chunk deployed on Netlify
(`index-FJcUVmf_.js`) was byte-identical to the one built locally. Identical
hashes mean identical inputs -- so whatever produced the deployed files had the
same environment as a plain local `npm run build`, which has no `VITE_API_URL`.
`netlify.toml`'s `[build.environment]` had never been read.

That happens whenever the `build/` folder is uploaded by hand rather than built
by Netlify's CI: **`netlify.toml` only configures builds Netlify itself runs.**

### The fix

`frontend/.env.production`, committed, holding the one line. Vite loads it
automatically for `npm run build`, so the URL is baked in by *any* production
build -- local, hand-uploaded, or CI. `netlify.toml` keeps its copy as
belt-and-braces.

`.gitignore` needed an exception: it ignored `.env.*` wholesale. The API
hostname is public -- it is already sitting in `netlify.toml`, and anything
`VITE_`-prefixed ships to every visitor regardless -- so there is nothing secret
being committed. **`frontend/.env` still points at localhost and stays ignored**,
which is what makes `npm run dev` work.

Verified: the rebuilt bundle contains the Render URL once and
`http://localhost:4000` zero times.

---

## Janmashtami banner, and the morning cold start  2026-08-31

**The banner.** Home's festival slot now carries the shop's Janmashtami
artwork; Raksha Bandhan is past and its three files are deleted. The new art is
the same 1774x887 as the old, so the card's fixed aspect ratio needed no change.
Derivatives were generated with Pillow -- there is no sharp or ImageMagick on
this machine -- at quality 82: `janmashtami-750.webp` (54 kB),
`janmashtami-1200.webp` (108 kB), `janmashtami-1200.jpg` (141 kB, the fallback).
Heavier than the Raksha Bandhan set because the composition carries more
photography; if it needs to come down, quality is the dial.

**The cold start.** The client noticed the first call of the morning takes about
a minute and everything after it is fine. That is Render's free tier: the
container spins down after 15 minutes idle and takes roughly a minute to boot
Node and reconnect to Atlas. Nothing is broken. Two fixes, because they solve
different halves of it:

1. `.github/workflows/keep-api-warm.yml` pings `/health` every 10 minutes
   between 00:00 and 17:00 UTC (05:30-22:30 IST). Ten and not the fourteen this
   log first proposed, because GitHub's scheduler runs late under load and the
   sleep timer is unforgiving. Opening hours only, because Render's free tier
   allows 750 instance hours a month and a round-the-clock ping would spend
   almost all of them on a shop nobody is looking at; this window is ~550. The
   repo is public, so the Actions minutes are free. **GitHub disables scheduled
   workflows after 60 days with no repository activity** -- if the mornings get
   slow again, look here first.
2. The app stops making the customer pay for a wake the cron does not cover
   (outside those hours, or just after a deploy):
   - `warmUpApi()` in `src/lib/api.js`, called once from `App.jsx`, pokes
     `/health` fire-and-forget the moment the app mounts. Whatever the customer
     reads first, the container boots underneath them.
   - `useProducts` retries a cold start instead of reporting it. A sleeping
     instance refuses the connection rather than answering slowly, so the first
     fetch failed in about a second and a customer with no cache got "could not
     load the shop" for a shop that was merely booting. Six retries, six seconds
     apart, only when the connection failed outright (`status === 0`) and only
     while there is nothing on screen -- a 4xx/5xx is the server answering and
     repeating it would just repeat the answer.
   - After four seconds the hook raises `waking`, and Home and Products show
     `WakingNotice` -- "Opening the shop — just a moment." Home in particular
     used to hold skeletons no matter what happened, so a sleeping API and a
     dead one looked identical; it now has all three states, error included,
     with a Try again that calls `reload`.

The cache in `useProducts` still does the heaviest lifting for anyone who has
visited before -- they see the previous catalogue instantly. All of this is for
the first-ever visit, which is exactly the visit that decides whether someone
comes back.

Not verified in a browser: build passes and `/health` answers in 0.5s, but the
waking notice has not been watched on a real cold instance.

---

## Order status reaches the Google Sheet  2026-09-03

The shop completes or cancels an order in the admin panel and the sheet went on
showing `placed` forever. They still read their orders off that sheet, so it was
not merely stale -- it was a record actively contradicting what they had just
done, on the one screen they trust.

**Only order creation ever wrote to the sheet.** `PATCH
/orders/:orderNumber/status` updated MongoDB and stopped there.

### The receiving end was the actual obstacle

The obvious fix -- re-post the order when its status changes -- would have made
things worse, because the deployed Apps Script appends unconditionally:

```js
sheet.appendRow([ data['Order ID'], ... ]);
```

So every "Mark done" would have added a **second row for the same order**. The
script had to learn to upsert on `Order ID` before the backend change was worth
anything. Full replacement and deployment steps: **`docs/GOOGLE_SHEET_SYNC.md`**.
The root `GOOGLE_APPS_SCRIPT_UPDATE.md` is superseded and now says so at the top
-- deploying what is on that page would reintroduce exactly this bug.

The new script also **maps by header name rather than column position**. The old
one hardcoded twelve indexes; `toSheetRow` has grown to eighteen fields since,
so `Email`, `City`, `State`, `Pincode`, `Subtotal`, `Discount` and `Coupon` were
being posted into a script that had no idea they existed. Matching on the
heading text means the sheet's column order stops mattering and the shop can
reorder or add columns without anyone touching code.

Three smaller things fell out of it: **columns the payload does not mention are
left alone**, so a `Notes` column the shop types into by hand survives a status
update; the notification email fires on **new orders only**, because mailing
them about their own tap is noise against a 100/day quota; and a `LockService`
lock closes the race where two orders landing in the same second both read the
same last row.

### Backend

`syncOrderStatusToSheet` in `services/sheets.js`, called fire-and-forget from
the status route exactly as order creation calls its counterpart. The client is
at a counter with a customer in front of them -- neither a slow Apps Script nor
a Google outage may make "Mark done" hang or fail. The status is committed to
Mongo before the push is attempted.

It sends the **whole row**, not just the status cell. The script keys off header
names either way so a partial payload buys nothing, and if the creation sync
never landed (Google down at checkout) the upsert appends the missing row here
instead of failing against a row that does not exist. That is why success also
sets `sheetSynced`: a post that returns OK means the row is in the sheet,
whichever branch the script took to put it there.

Two attempts rather than creation's three. Both run in the background, but a
lost order is unrecoverable where a stale status cell is fixed by the next
change to that order re-posting everything.

**`sheetStatusSyncedAt` / `sheetStatusSyncError` are new fields on `Order`, and
a failed status push deliberately leaves `sheetSynced` alone.** The two answer
different questions -- "is this order in the sheet at all" versus "did its last
status change get there" -- and folding them together would drop every status
failure into `retryFailedSyncs`' queue as though the order itself had been lost.

Also added to the row: **`Status Updated`**, so a row that changed can be told
from one that has sat there since it was placed.

### Verified

Two harnesses, both green, neither needing a database or a real spreadsheet:

- **The Apps Script, extracted from the doc's own code fence** (so the test runs
  what the client will paste) against a fake `SpreadsheetApp`. 19 checks:
  placed -> completed -> reopened -> cancelled leaves **one row**, carrying
  `cancelled`; one email, not four; the right row updated among many; a `Notes`
  column preserved; an old twelve-column sheet still upserts; an empty sheet
  writes its own headers; a sheet with no `Order ID` column throws rather than
  writing junk.
- **`syncOrderStatusToSheet` against a local HTTP stand-in**, Mongoose stubbed.
  19 checks: paise converted, 18-key payload, `text/plain` so there is no
  preflight, one post on success and the right fields recorded; on a 500, two
  attempts with a real backoff, the error recorded, and `sheetSynced`
  untouched. Order creation still posts once on success and retries three times
  before flagging itself for `retryFailedSyncs`.

**Not verified against the real sheet, and it cannot be from here** -- the Apps
Script lives in the client's Google account. Deploying it is the remaining step,
and until it is done status changes will duplicate rows rather than update them.
The one-step check afterwards: complete an order in `/admin/orders` and watch the
existing row's Status change rather than a new row appearing.

---

## Resume here

Running locally needs both:

```bash
cd frontend && npm run dev   # storefront
cd backend  && npm run dev   # API on :4000 -- without it the shop is empty
```

**Still to do** (rewritten 2026-08-28; several items below were stale):

0. **Deploy the new Apps Script** (`docs/GOOGLE_SHEET_SYNC.md`). The backend
   pushes status changes to the sheet as of 2026-09-03, but the script that
   receives them still appends, so until it is redeployed a completed order adds
   a duplicate row instead of updating its own. Nothing else here is blocked by
   it, and it is five minutes in the client's Google account.
1. **`ADMIN_UIDS` on Render.** Local `backend/.env` now lists both the developer
   and the shop (`timelessbazzar76@gmail.com`). **Render has its own copy of the
   environment and has not been updated**, so the shop account is an admin
   locally and *not* in production. This is the one thing that will bite at
   handoff.
2. **Cloudinary image upload.** The admin form still takes an image *path*, so
   the client cannot add a product photographed on their phone. The last gap
   stopping the panel from being genuinely self-serve.
3. **Checkout is the last screen on `ForestHeader`.** Everything else is
   converted. Once it is done, `ForestHeader.jsx` and `ScallopedSeam.jsx` are
   dead and can be deleted.
4. **A short written guide for the client.**

(The Render keep-alive that stood here is done -- see the 2026-08-31 entry.)

Smaller, still outstanding:

- Bulk price update — the most direct cure for the original "iska price bada
  do" problem, and still not built.
- **Nothing in this session has been verified in a browser.** The client
  confirmed the admin order transitions by using them, but the cancelled-order
  screen, the Devanagari rendering and the whole Phosphor icon pass have only
  been verified by build and by inspection.

**Done since this list was last written:** the API *is* deployed and live on
Render (`/health` answers, DB connected); the admin panel *does* have an orders
view; the client's UID *is* in the local `ADMIN_UIDS`; Products, Cart, Orders,
Login and Signup are all off the forest header.
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
