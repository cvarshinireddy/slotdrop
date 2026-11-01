# Viva preparation: 15 likely questions

Every answer below is taken from what the code actually does. Where something is a weakness or is untested, the answer says so, because an examiner who finds a gap you did not mention costs you more than one you owned up to. File paths are given so you can open the code while answering.

**Two sentences to have ready about testing** (use them whenever it comes up): "The business logic that does not need a database (OTP, suggestions, analytics, validation, seed consistency) is covered by 78 passing tests, and the whole interface is covered by 80 automated browser checks and a Lighthouse audit that scores 100 on every screen. The concurrency and database tests are written, but I could only run them where MongoDB is available, and I ran them on [date / result]."  *(Fill in the bracket after you run `cd server && npm test`. If you have not, say "I have not run them yet".)*

---

## Architecture

### 1. Give me the architecture in one minute. Why these choices?

A React single-page app talks to an Express API over REST, plus Socket.io for pushing live updates; the API stores everything in MongoDB. The server is layered: **routes -> middleware (auth, role check, validation, rate limit) -> thin controllers -> services (all business logic) -> models**. Putting logic in services keeps it testable without HTTP.

Why MongoDB: parcels, bookings and slots are naturally documents, and what the hardest requirement (no overbooking) needs is **atomic single-document updates**, which MongoDB provides. The cost: relationships are references, so integrity comes from application code plus indexes, not foreign keys. Why a monolith: one society, one deployable unit, easy to run and to explain; it would be split only if load demanded it.

*Code:* `server/src/` (`routes`, `controllers`, `services`, `models`), README architecture diagram.

### 2. Why does the client have a "mock mode"? Isn't that faking it?

It is a development and demo tool, not a substitute for testing the real thing. `client/src/lib/api.js` exposes one interface with two implementations: the real REST client and an in-browser mock that mirrors the server's response shapes and error codes. It let me build and test every screen without a database, and it gives a working demo if the network fails. The risk is **drift** between mock and server; I mitigated it by checking each real call against the server's response shapes and fixing the mismatches I found (for example, the booking view needed the parcel's flat number populated). But I want to be straight: the real client-to-server path has been verified by reading code, not by running it end to end, until I run it against MongoDB.

*Code:* `client/src/lib/api.js`, `client/src/mocks/mockApi.js`, `client/src/lib/realApi.js`.

---

## Concurrency and correctness

### 3. How do you guarantee two residents cannot book the last seat in a slot?

By never doing "read the count, then write". The booking service does one conditional update:

```js
Slot.findOneAndUpdate(
  { _id, isClosed: false, startsAt: { $gt: now }, $expr: { $lt: ['$booked', '$capacity'] } },
  { $inc: { booked: 1 } }
)
```

The check ("is there room?") and the increment happen inside MongoDB as one atomic operation on one document. If ten requests race for the last seat, MongoDB serializes them: one matches, the others match nothing and get `409 SLOT_FULL`. A read-then-write version would let several requests all read "1 seat left" and all succeed.

The test for this is `booking.capacity.test.js`: 20 simultaneous requests against a 3-seat slot must produce exactly 3 successes and `booked === 3`. *(State whether you have run it.)*

*Code:* `server/src/services/bookingService.js` (`createBooking`).

### 4. After claiming the seat you still do more steps. What if one fails, or the server crashes midway?

After the seat, the service atomically claims the **parcel** (`findOneAndUpdate` where status is still `RECEIVED`), then creates the booking. If the parcel claim or booking creation fails, a `catch` block **gives the seat back** (`$inc: -1`) and, only if this request had claimed the parcel, reverts it. (I fixed a bug here during development: the first version could reset *another* request's parcel.) A database-level safety net also exists: a unique partial index allows only one `ACTIVE` booking per parcel.

The honest weakness: this is a **compensating action, not a transaction**. If the process is killed between claiming the seat and claiming the parcel, one seat leaks (shows booked with no booking). On Atlas (a replica set) I could wrap the steps in a multi-document transaction, or run a reconciliation job that recomputes `booked` from the bookings. I chose compensation because it also works on a standalone MongoDB and in tests.

### 5. Where is the OTP stored, and how do you stop someone guessing it?

**It is not stored.** The OTP is `HMAC-SHA256(OTP_SECRET, bookingId + nonce)` reduced to six digits. The database stores only a random per-booking nonce. So:

- a database leak alone reveals no OTPs (the attacker would also need the server secret);
- the owning resident can reopen the pass and see the same OTP, which a one-way hash would not allow without storing it;
- every booking has an unrelated OTP.

Why not just bcrypt a six-digit code? Only a million possibilities, so a leaked hash could be brute-forced offline in seconds. A keyed HMAC makes the secret the barrier.

Online guessing is limited three ways: a booking **locks after 5 wrong attempts** (`otpAttempts`), the verify endpoint is **rate limited** (30/min per IP), and the OTP **expires** (slot end + 2 hours). It is **single-use**: the booking is consumed by one conditional update (`otpUsedAt` still null, not expired, attempts under 5), so two simultaneous scans produce exactly one success. Comparison uses `crypto.timingSafeEqual`.

*Code:* `services/otpService.js`, `services/handoverService.js`. *Say "derived", not "hashed".*

### 6. Why does the QR code contain a signed token instead of the OTP?

So the QR can be verified without the guard ever typing or seeing an OTP. The QR holds a JWT with the booking id, signed with `OTP_SECRET` (a *different* secret from the login JWT, tested: a login token is rejected as a QR) and expiring with the booking. Scanning it goes through the same atomic single-use consume as the OTP. A screenshot of the QR is as shareable as the OTP, which is a real limit; the short validity window and single-use rule are the mitigation.

---

## Security

### 7. How do authentication and authorization work, and where could it fail?

Login returns a JWT (7-day expiry); passwords are bcrypt-hashed (10 rounds). On **every request** the server verifies the token **and reloads the user**, so a deactivated account loses access immediately and role changes take effect. Role checks (`requireRole('guard')`, etc.) are middleware on each route, enforced server-side; the React route guards are only a convenience, never the security boundary. Residents are scoped in the *query* (filter by their flat), not filtered after fetching, and a resident asking for someone else's parcel gets a `404`, not `403`, so ids cannot be probed.

Where it could fail: the token lives in `sessionStorage` (readable by script, so an XSS bug would expose it; an httpOnly cookie avoids that but then needs CSRF protection). There are no refresh tokens or server-side revocation list. React escapes output and Helmet is enabled, which reduces XSS risk, but I would not claim it is eliminated.

### 8. What attacks did you consider, and did you find any real bugs?

- **Brute force on login:** 10 attempts per 15 minutes per IP, and unknown users do the same bcrypt work as wrong passwords (no timing difference to enumerate accounts).
- **Injection:** every body, query and param is validated with zod. I found a **real operator-injection hole** in my own code during a review pass: `GET /users?role[$ne]=admin` put the query-string value straight into a Mongo filter. It is now validated and has a regression test. Login also rejects `{ "$ne": "" }` objects because fields must be strings. Flat search escapes regex characters.
- **Privilege/OTP exposure:** only `GET /bookings/:id` for the owning resident returns an OTP; the guard's schedule and the audit timeline never include OTP data (there is a test asserting the OTP string does not appear in those responses).
- **Uploads:** MIME allow-list, 5 MB limit, filename generated by the server.
- **Not covered:** denial of service beyond the rate limits, dependency scanning in CI, and a formal security review.

---

## Real-time, algorithms, data

### 9. How does real-time work, and what happens with several server instances?

After the browser connects, the Socket.io handshake carries the JWT; the server verifies it and puts the socket in two rooms: `user:<id>` and `role:<role>`. Services emit events (`parcel:new`, `parcel:updated`, `notification:new`) to the right rooms; notifications are also saved in MongoDB so offline users see them later. The client refreshes its data when events arrive and ignores stale responses.

With **more than one instance**, an event emitted on instance A would not reach sockets on instance B. The fix is the Socket.io Redis adapter plus sticky sessions. One more thing to know: `slot:updated` is broadcast to everyone, which is fine for one society but chatty at scale; per-day rooms would be better. The hourly reminder job already tolerates multiple instances because each parcel is claimed with an atomic update before notifying.

### 10. Explain the "Suggested for you" feature. Is it machine learning?

No, and I chose that deliberately: it is a small, explainable algorithm. For a resident, take their past pickups and compute a histogram of **pickup hour**, weighting each pickup by `0.5^(age in days / 30)` so recent behaviour counts more (half-life 30 days). A slot's score is its hour's weight plus half the weight of the neighbouring hours (collecting at 7 PM also makes 6 and 8 PM reasonable). Open slots are ranked by score, ties go to the less-loaded slot, a slot must reach at least 25% of the best score to earn a badge, and at most two are shown. With **no history** (new resident) the app suggests the single quietest slot, which also spreads load. The response includes *why* ("based on when you usually collect" or "quietest time") so the badge is explainable.

Limits: it only uses pickup hour (not weekday), and I validated it with unit tests on constructed histories, not with real users.

*Code:* `services/suggestionService.js`, `tests/insights.unit.test.js`.

### 11. How did you handle time zones?

All society time is India Standard Time, which is UTC+5:30 with **no daylight saving**, so a fixed offset is safe. Slots store exact UTC instants (`startsAt`, `endsAt`) plus a `dateKey` string (`YYYY-MM-DD` in IST) used for grouping. The classic bug is a parcel received at 11:30 PM IST being counted on the wrong day because the server runs in UTC; helpers in `utils/dates.js` do all day-bucketing in IST, and there are tests for the midnight boundary (`dates.test.js`, `insights.unit.test.js`).

---

## Scalability and testing

### 12. What breaks first if this grows 10x, or to many societies?

In rough order: (1) **Analytics** are computed in application code from the last N days of parcels; at thousands per day that should become a MongoDB aggregation or pre-computed daily counters (`buildAnalytics` is pure, so swapping the data source is easy). (2) **Parcel lists** return the latest 50 with no pagination. (3) **Photos** are on local disk, which is ephemeral on Render and not shared across instances; use object storage (the storage layer is behind a small module for this). (4) The broadcast `slot:updated` event and multi-instance sockets (see Q9). (5) **Multi-society** needs a tenant id on every collection and in every query; today it is a single-society design. Indexes already exist for the hot queries (parcels by flat and status; slots unique by day and start; notifications by user and time).

### 13. How did you test it, and what did you NOT test?

**Tested and passing:** 78 server tests that need no database (OTP derivation and QR tokens, suggestion scoring, analytics aggregation, validation schemas, seed-data consistency across four clock times, date handling); 80 browser checks driving all three roles in mock mode including realtime between tabs and role redirects; Lighthouse accessibility on 60 screen/theme/viewport combinations, all 100. The tests found real bugs: a crash when the camera is unavailable, a stale-response race, text dimmed below contrast limits.

**Written but not yet run:** 29 tests that need MongoDB (concurrent booking, OTP verification flow, role access matrix, admin endpoints), the seed script against a real database, the real client-to-server path, and QR scanning with a physical camera, because my build environment blocked the MongoDB download and has no camera. *(Update this answer once you have run them.)* I would rather say that than imply coverage I do not have.

---

## Features and limits

### 14. How does delegation to a neighbour work, and how could it be abused?

The resident creates a one-time code for a named person (max 3 active per booking). Like the OTP it is **derived** (HMAC of the delegation id and a nonce), never stored, and shown only to the owner. It expires at the earlier of the requested duration (24 hours by default, 48 at most) or the booking's expiry, and works once: using it marks both the delegation and the booking consumed in the same flow. The guard enters flat + code, matched only against that flat's live bookings, so the guessing space is small per flat but protected by the same 5-attempt lockout and rate limits (the alphabet has 32 characters, so 6 characters is about a billion combinations). The audit log records `DELEGATED` and then `DELIVERED` with the delegate's name, and the success screen tells the guard who is collecting. Abuse case: the resident shares a code with the wrong person. That is their choice and is recorded; the code cannot be reused.

### 15. What are the limitations, and what would you build next?

Honest list: single society; in-app notifications only (no SMS or WhatsApp, which most residents would expect); photos on ephemeral disk; reminders run inside the web process so a sleeping free-tier instance misses them (use an always-on instance or an external scheduler); compensating action instead of transactions (Q4); only the booking resident can see the pass (flat-mates cannot); no refresh tokens; parcel data (names, flat numbers, photos, phone numbers) is personal data, so a real deployment needs a retention policy and consent aligned with India's data-protection law, which I have not implemented.

Next: Redis for multi-instance sockets, object storage, WhatsApp/SMS notifications, MongoDB aggregation for analytics, multi-society tenancy, integration with existing gate apps, handling returns and re-delivery attempts, and a pilot with a real society to measure missed-delivery rates and gate time per parcel (the actual success metric, which I have not measured).

---

## Quick-fire (one-liners)

- **Why zod?** One schema validates and cleans input, and returns field-level errors the UI can show.
- **Why is "Overdue" not stored?** It is derived (still `RECEIVED` after 48 h); storing it would need a job to keep it in sync and could go stale.
- **Why doesn't `booked` go down on delivery?** It counts seats held, so a collected slot stays counted; only cancelling releases a seat.
- **Why bottom tabs on mobile and a sidebar on desktop?** Thumb reach on phones (guards use one hand); screen space on desktop. One nav config drives both.
- **How is "Linear meets Swiggy" shown in the design?** Calm neutral surfaces and one teal accent (Linear), friendly copy and big tappable actions (Swiggy); all colours are CSS-variable tokens, so dark mode is a class swap and contrast is checked by script.
- **Why can't a resident see another flat's parcel id exists?** The API returns 404, not 403, for parcels outside their flat.
- **What is the audit log for?** Disputes ("I never got it"): who logged it, who booked, who handed it over and when. It is append-only; the model rejects updates and deletes.

## If you do not know

Say: "I did not build or test that part. Here is how I would find out." Then name the file you would open or the test you would write. Examiners reward knowing the boundary of your work.
