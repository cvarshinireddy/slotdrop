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
- ES modules, 2-space indent, async/await, no `any`-style sloppiness; small files with one responsibility.
- API: REST under `/api`, JSON `{ data }` / `{ error: { code, message } }`.
- Commits: conventional style (`feat:`, `fix:`, `test:`, `docs:`, `chore:`), one per workflow step minimum.
- Env vars documented in `.env.example`; never commit secrets.
- Comment the *why* for concurrency, security and OTP logic — these are viva talking points.

## Workflow (strict, one step at a time)
0 CLAUDE.md + git → 1 Plan (await approval) → 2 Models/auth/RBAC → 3 Parcel/slot/booking APIs → 4 Handover/delegation/audit/cron/Socket.io → 5 Design system + `/design-system` page → 6 Screens (mock → API) → 7 Dashboard/charts/suggestions → 8 Tests/seed/bug-fix → 9 Polish + Lighthouse a11y.
After every step: run app/tests, fix errors, check 375px and 1280px, commit, give a 3-line summary.

## Final deliverables
README (setup, API docs, Mermaid architecture + ER), deployment guide, 5-min demo script with logins, 15 viva Q&A, project report draft.
