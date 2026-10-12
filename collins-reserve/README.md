# Collins Reserve — MAISON NOIR

A complete, deployable premium restaurant platform demo: a public fine-dining site, online ordering, reservations with live capacity locking, a staff dashboard, and accountless realtime order tracking — built on React 19 + TypeScript + Tailwind CSS 4 + live Firebase.

**MAISON NOIR is a fictional restaurant.** Every order, reservation and figure in the app is demo data. No payment is ever processed (checkout is `pay on collection` only).

> **Live demo — https://collins-reserve-demo-42b6.web.app**
> Admin dashboard: https://collins-reserve-demo-42b6.web.app/admin/login — credentials below.

---

## What's inside

| Experience | Routes | Highlights |
| --- | --- | --- |
| Public site | `/`, `/story`, `/experiences`, `/contact`, `/privacy`, `/terms`, `/cancellation-policy` | Editorial design system, live menu/experience data, mobile-first |
| Order online | `/menu`, `/order`, `/order/:reference` | Dish detail modal, cart (persisted), pickup/delivery, demo checkout, **live tracking by reference — no account needed** |
| Reservations | `/reserve` | 3-step flow, real availability per day, seat-level capacity lock, always "pending" until staff confirm |
| Staff dashboard | `/admin/*` | Overview KPIs, order queue with status transitions, reservations list + calendar, menu CRUD, tables, availability, customers, reports (charts), settings |

Realtime end-to-end: staff accepts an order in `/admin/orders` → the customer's `/order/MN-483920` page updates live.

## Tech stack

- **React 19 + TypeScript + Vite** (strict, `@` path alias), lazy-loaded routes
- **Tailwind CSS v4** with a design-token layer (`src/styles/index.css`) — Apple.com typography (SF Pro system stack, Inter fallback; measured sizes/weights/tracking), ivory/champagne/ink palette
- **Firebase**: Firestore (live project, `africa-south1`), Authentication (email/password for staff), Hosting
- **Security Rules** that recompute every order total from menu prices and lock reservation capacity (see [Security model](#security-model))
- react-hook-form + zod, recharts, lucide-react, date-fns, oxlint

## Quick start

Prerequisites: **Node 20+**, npm.

```bash
npm install
cp .env.example .env      # then fill in your Firebase web app config
npm run seed              # demo restaurant, menu, tables, staff user, sample data
npm run dev               # http://localhost:5173
```

### Demo staff login

```
URL      /admin/login
Email    admin@maisonnoir.demo
Password MaisonNoir2026!
```

(The login page shows these credentials in a "Demo access" box too.)

## Firebase setup (fresh project)

The repo ships with `firestore.rules`, `firestore.indexes.json` and `firebase.json` already wired:

1. Create a project, add a **Web app**, copy its config into `.env`.
2. Create a **Firestore database** (e.g. region `africa-south1`).
3. Enable **Authentication → Sign-in method → Email/Password** (staff sign-in).
4. Deploy rules and indexes: `firebase deploy --only firestore` (requires `firebase-tools` logged in and `--project <id>`).
5. Seed demo data: `npm run seed` (uses a service-account key at `~/.collins-reserve/service-account.json` with `roles/firebaseauth.admin` + `roles/datastore.user`).
6. `npm run dev`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check (`tsc -b`) + production build to `dist/` |
| `npm run lint` | oxlint (0 errors, 0 warnings is the baseline) |
| `npm test` | Vitest unit tests: order totals incl. **service-charge rounding parity with the rules**, status transition table, reference formats, date/time formatters |
| `npm run seed` | Idempotent demo seed: restaurant, settings, 5 categories, 19 dishes, experiences, 13 tables, sample orders/reservations, staff account |
| `npm run verify:rules` | **Live Security Rules suite** — signs in a real non-staff customer via Identity Toolkit, then asserts the deployed rules: tampered totals rejected, valid order accepted (service-charge rounding parity), public tracking reads, staff transitions, reservation validation, slot capacity lock. Cleans up after itself. |
| `npm run smoke` | **End-to-end browser smoke** (Playwright against the dev server): all public routes, menu → cart → checkout, order placed → live tracking, staff sign-in + queue accept verified live on the customer page, full reservation flow, zero page errors. Cleans up its orders/reservations/slots. |

Both verification scripts need `.env` and the service-account key.

## Architecture

```
src/
  app/            providers, router (lazy routes)
  pages/public/   site, menu, ordering, reservations, legal
  pages/admin/    dashboard pages + _adminui shared building blocks
  components/     ui kit (Button, Field, Modal/Drawer, States…), layout, menu, ordering
  context/        cart (localStorage-persisted), auth, toasts
  hooks/          live Firestore data providers, UI hooks
  services/       all Firestore access (orders, reservations, menu, tables, restaurant)
  styles/         Tailwind v4 @theme tokens + Apple-style typography utilities
scripts/          seed.mjs, verify-rules.mjs, smoke.mjs
```

### Data model (single restaurant: `maison-noir`)

| Collection | Notes |
| --- | --- |
| `restaurants/{id}`, `settings/{id}` | Brand, hours, fees, service charge, ordering toggles — public read |
| `menuCategories`, `menuItems`, `services`, `tables` | Public read; staff write |
| `orders/{MN-XXXXXX}` | **Document id is the human reference.** Totals recomputed by rules; status timeline; public `get` by full reference for tracking |
| `orders/{ref}/events` | Audit trail of status changes (staff-only write) |
| `reservations/{MN-RXXXXXX}` | Always created `pending`; public `get` by reference |
| `reservationSlots/{date--time}` | The concurrency lock: `taken` counts **seats**; public updates may only raise `taken` up to `capacity`, only staff release seats |
| `users/{uid}` | Staff profiles/roles — written by the Admin SDK only |

Money is stored as **integer KES**; timestamps are epoch millis; dates/times follow `Africa/Nairobi`.

### Security model

`firestore.rules` is expression-only (no loops): order lines are validated and **totals recomputed from `menuItems`** (up to 8 lines / 3 variants / 3 add-ons — mirrored by `MAX_ORDER_LINES`), delivery/pickup toggles and `pay_on_collection` are enforced, status changes must follow the transition table and are field-restricted via `diff().affectedKeys()`, and slot updates may never exceed capacity. Anything else is denied.

Track any order **without an account**: `/order/MN-483920` (references are random 6-digit values — a demo convenience, not a production pattern for sensitive data).

## Deploy

```bash
npm run build
firebase deploy --only hosting,firestore:rules,firestore:indexes --project <your-project-id>
```

Hosting serves `dist/` with an SPA rewrite and immutable asset caching (`firebase.json`).

## Notes & known trade-offs

- **No fake payments.** The checkout offers "pay on collection" only and says so — adding a real PSP is out of scope by design.
- Order/reservation creation is intentionally open to signed-out visitors; price and capacity integrity come from the rules, not from client trust.
- Staff emails/passwords are ordinary Firebase Auth users; roles live in `users/{uid}` and can only be written by the Admin SDK.
- `@grpc/grpc-js` (a `firebase` dependency) reports audit advisories in the Node transport path — the browser bundle never uses it; upgrading to a patched grpc-js release would require dropping to firebase@9's peer range, so the advisory is accepted for this demo.
- `npm warn allow-scripts` appears for `@firebase/util` and `protobufjs` postinstalls (build-time codegen). Review with `npm approve-scripts` if your policy requires it.

## Verification status

- `npm run lint` / `tsc -b` / `npm run build` — clean
- `npm test` — 23/23 unit tests
- `npm run verify:rules` — 11/11 against the **deployed** rules
- `npm run smoke` — 12/12 end-to-end (routes, cart, checkout, realtime tracking, staff accept, reservations, zero page errors)
