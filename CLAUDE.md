# SlotDrop — Project Rules

Parcel handover slot-scheduling platform for Indian apartment societies. Security logs a parcel at the gate, the resident books an exact handover slot, and the parcel is released only after OTP/QR verification. 4th-year engineering mini project: it must demo like a startup product and the code must be explainable in a viva.

## Stack
- **Client** (`/client`): React + Vite + Tailwind + shadcn/ui + Framer Motion + Recharts + lucide-react, html5-qrcode (scan), socket.io-client
- **Server** (`/server`): Node.js + Express, MongoDB + Mongoose, JWT auth, Socket.io, qrcode, multer, node-cron, bcrypt, Jest + supertest (+ mongodb-memory-server)
- **Deploy**: Vercel (client) + Render (server) + MongoDB Atlas

## Roles
`resident`, `guard`, `admin`. JWT bearer auth, RBAC middleware `requireRole(...roles)`.

## Backend rules (non-negotiable)
- Slot capacity enforced **atomically** (single conditional `findOneAndUpdate` with `$expr`/`booked < capacity` and `$inc`; never read-then-write).
- Validate every input (zod or express-validator). bcrypt for passwords. Rate-limit auth routes.
- OTPs are stored **hashed**, expire, and work once. Plain OTP is returned only to the owning resident (and delegate code to the owner). Guards/admins never see OTPs.
- Every status change writes an AuditLog entry.
- Layout: `server/src/{routes,controllers,models,middleware,services,utils,config,jobs,sockets}`; controllers are thin, business logic lives in services.
- Tests (Jest): booking capacity under concurrency, OTP verification, role access.
- Seed script: 1 admin, 2 guards, 10 residents, 30 parcels, a week of slots; realistic Indian names, flats (A-1204), couriers (Amazon, Flipkart, Swiggy Instamart, Blinkit, Zomato, Myntra, Delhivery, BlueDart).

## Design rules
- Feel: calm, trustworthy, modern — "Linear meets Swiggy".
- Mobile-first (375px) up to 1280px+. Bottom tabs on mobile, sidebar on desktop.
- **All colors via CSS-variable tokens** (light + dark). Never hardcode hex in components.
- One primary accent, neutral grays, status colors: Received=amber, Slot Booked=blue, Delivered=green, Overdue=red.
- Fonts: one display + one body (Google Fonts). Scale 12/14/16/20/28/36. 8px spacing grid, `rounded-2xl` cards, soft shadows.
- lucide-react icons only; **no emoji in UI**; tap targets >= 44px; no purple-gradient clichés.
- Motion: Framer Motion, <= 250ms transitions, respect `prefers-reduced-motion`.
- A11y: WCAG AA contrast, keyboard nav, aria labels, visible focus rings.
- Copy: short, human, Indian context ("Your Amazon parcel is at the gate. When should we hand it over?").
- Build/reuse the component library first: Button, Card, StatusChip, SlotChip, Stepper, QRCard, EmptyState, Toast, Modal, Skeleton.

## Conventions
- Server: CommonJS (simplest Jest setup); client: ES modules. 2-space indent, async/await, no `any`-style sloppiness; small files with one responsibility.
- API: REST under `/api`, JSON `{ data }` / `{ error: { code, message } }`.
- Commits: conventional style (`feat:`, `fix:`, `test:`, `docs:`, `chore:`), one per workflow step minimum.
- Env vars documented in `.env.example`; never commit secrets.
- Comment the *why* for concurrency, security and OTP logic — these are viva talking points.

## Workflow (strict, one step at a time)
0 CLAUDE.md + git → 1 Plan (await approval) → 2 Models/auth/RBAC → 3 Parcel/slot/booking APIs → 4 Handover/delegation/audit/cron/Socket.io → 5 Design system + `/design-system` page → 6 Screens (mock → API) → 7 Dashboard/charts/suggestions → 8 Tests/seed/bug-fix → 9 Polish + Lighthouse a11y.
After every step: run app/tests, fix errors, check 375px and 1280px, commit, give a 3-line summary.

## Final deliverables
README (setup, API docs, Mermaid architecture + ER), deployment guide, 5-min demo script with logins, 15 viva Q&A, project report draft.

## Known environment limitation (sandbox)
`fastdl.mongodb.org` is blocked by the cloud sandbox network policy, so `mongodb-memory-server` cannot download its binary and **DB-backed Jest tests cannot run here** (`rbac.test.js`, `booking.capacity.test.js`, `otp.verification.test.js`). Only the DB-free tests run: `npm run test:nodb` (smoke, dates, otp.unit, insights.unit, seed.unit, validation.unit). Also unrun: `admin.test.js`. DB-backed tests are written but UNVERIFIED until run where MongoDB is reachable (local machine, CI, or after allowing the host). Do not claim they pass. Run them with `cd server && npm test`.

## Client modes and testing (Step 6)
- `VITE_API_MODE=mock` runs the whole client against an in-browser mock API (`client/src/mocks/mockApi.js`, mirrors server shapes/error codes, synced across tabs via BroadcastChannel). `VITE_API_MODE=api` (default) talks to the Express server. Both implement the same interface in `client/src/lib/api.js`; keep them in sync when the server contract changes.
- Auth token lives in **sessionStorage** (per tab) so a guard and a resident can be signed in side by side in one browser for demos.
- Regression run (mock mode, no server): `cd client && VITE_API_MODE=mock npx vite --host 127.0.0.1 &` then `node scripts/e2e-mock.cjs /tmp/e2e` (80 checks: resident/guard/admin flows, users and flats, realtime, RBAC, charts and capacity manager, 375px/1280px overflow, 44px tap targets, console errors).
- The real-API wiring (`realApi.js`, Socket.io) is checked against server response shapes by reading code, but is **not yet run end to end** because the sandbox has no MongoDB. Verify on a machine with MongoDB.

## Dashboard and suggestions (Step 7)
- Smart suggestion: `server/src/services/suggestionService.js` (recency-weighted pickup-hour histogram, 30-day half-life, neighbour smoothing, min 25% of best score, fallback to least-loaded slot). Ported 1:1 to the mock API; keep both in sync.
- Analytics: `analyticsService.buildAnalytics` is pure (unit tested); `getAnalytics` only fetches rows. Slot-window edits go through `slotService.syncToTemplates` (never deletes slots that have bookings).
- Charts follow the dataviz rules: single series in the `--primary` token, thin marks, hairline grid, tooltip on hover, text summary + table view per chart, one date-range filter row that scopes everything, dimmed (not skeleton) while refetching.

## Seed, users and hardening (Step 8)
- `npm run seed` (server) wipes and loads demo data: 1 admin, 2 guards, 10 residents, 14 flats, 30 parcels, 22 bookings, ~200 slots (10 days of history + a week ahead). Refuses to run when NODE_ENV=production unless `--force`. **Not run in the sandbox** (no MongoDB); the data builder (`seed/seedData.js`) is pure and covered by `seed.unit.test.js` (relationships, counts, schema validation at four clock times).
- Demo logins (password `SlotDrop@123`): priya.sharma@slotdrop.in (resident, A-1204), guard1@slotdrop.in, admin@slotdrop.in.
- Hardening fixes: `GET /users` validated its role filter (operator injection), default slot windows on first boot, refresh-race guards (ParcelsContext, capacity manager), scanner re-read cooldown (Handover). The cooldown needs a real camera to verify and has not been exercised.

## Polish and accessibility (Step 9)
- Lighthouse accessibility audit of every screen and modal state, light + dark, 375px + 1280px (60 snapshots, all 100): start `VITE_API_MODE=mock npx vite --host 127.0.0.1 &` then `cd client && npm run a11y` (flags: `--role Resident|Guard|Admin|public`, `--width 375|1280`, `--theme light|dark`). It logs in through a real browser session and uses Lighthouse snapshot mode; it waits for toasts to finish fading before measuring.
- Browser regression: `npm run e2e` (80 checks).
- Rules learned the hard way: never dim text with `opacity` (drops below AA; use muted tokens plus a visible label like "Done"/"Inactive"); every animation must total <= 250ms including delay; day/filter pills must not override their visible text with a different `aria-label`; headings go h1 > h2 > h3 without skipping (use `CardTitle as="h2"`); `scroll-padding` keeps focused elements clear of the fixed header, tab bar and confirm bar (WCAG 2.2 focus not obscured).
- Shell behaviour: skip-to-content link, document title per route, focus moves to `<main>` on client-side navigation (path comparison, StrictMode-safe).
- Code splitting: admin charts (recharts) and the guard scanner (html5-qrcode) are lazy chunks; a resident's first load is ~196 kB gzip.
