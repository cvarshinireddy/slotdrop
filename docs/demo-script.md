# 5-minute demo script

**One-line pitch:** "Couriers say 'arriving today'. Residents miss parcels. SlotDrop lets the resident pick the exact hour for handover, and the guard releases the parcel only against a one-time code."

## Setup (do this 10 minutes before)

**Two windows, two roles.** The login is stored per browser tab, so one browser can hold a resident and a guard side by side.

| Window | Size | Signed in as |
|---|---|---|
| **A: Resident** | Phone, or Chrome DevTools device mode at 375 px wide | `priya.sharma@slotdrop.in` |
| **B: Guard / Admin** | Laptop, full screen | `guard1@slotdrop.in` (later: `admin@slotdrop.in` in a third tab) |

Password for all: `SlotDrop@123`. The login screen has tap-to-fill buttons.

**Which mode?**
- **Full stack (preferred):** deployed app, or local server + seed (`npm run seed` first, so the data matches this script). Realtime between windows uses WebSockets.
- **No-database fallback:** `cd client && VITE_API_MODE=mock npm run dev`. Same screens and same demo accounts; the two windows must be tabs of the **same browser profile** (they sync through the browser). Use this if Wi-Fi or the database fails.

**Checklist**
- [ ] Reset data right before you start (full stack: re-run `npm run seed`; mock: `window.__slotdropMock.reset()` in the console).
- [ ] If the server is on a free host, open the app once so it is awake.
- [ ] Phone: camera permission already allowed for the site (needs HTTPS or localhost). Have the QR scan ready, but know the code-entry fallback (below).
- [ ] Browser zoom 100 %, notifications silenced, dark mode OFF (you switch it live at the end).

**Seeded story for Priya (flat A-1204):** three parcels at the gate (Amazon 2 h ago, Flipkart yesterday, Myntra 3 days old and marked overdue), one slot already booked for tomorrow evening that she shared with her neighbour Meera, and four past pickups, all in the evening. That history is why the app suggests evening slots for her.

---

## The run (5:00)

### 0:00 to 0:30. The problem (no clicking)

Say: "In a society with hundreds of flats the guard receives parcels all day, but residents have no say in *when* they are handed over. SlotDrop treats it like booking a doctor: the resident picks a slot, and the guard can only release the parcel against a one-time code."

### 0:30 to 1:15. Guard logs a parcel in seconds (Window B)

1. Sign in as the guard. You land on **Log a parcel**.
2. Type `A-12` in **Flat number**. The list narrows. Press **Enter** to pick `A-1204`.
3. Tap the **Blinkit** chip. Tap shelf **S-06**.
4. Tap the big button **Log Blinkit for A-1204**.
5. Point at the toast: it says how long it took ("... 6s").

Say: "Flat, courier, shelf: under fifteen seconds, hands never leave the screen. The photo is optional."

### 1:15 to 1:50. The resident is told instantly (Window A)

1. Without touching anything in Window A: the new **Blinkit** card appears at the top of **Parcels waiting for you** with a highlight ring, and a toast announces it. (Full-stack mode: pushed over WebSockets, no refresh.)
2. Tap the bell: the notification is there. Close it.

Say: "Real-time over Socket.io. Notice the status chips carry an icon *and* text, not just colour. Priya's Myntra parcel is red, 'Waiting 2+ days': the system flags overdue parcels, and an hourly job sends a reminder after 48 hours."

### 1:50 to 2:50. Booking a slot (Window A)

1. On the **Amazon** card that has the **Choose a slot** button, tap it. (In the full-stack seed Priya has two Amazon parcels; the other one is already booked and shows **View pass** instead.)
2. Tap the **second day pill (tomorrow)**.
3. Point out: **Suggested for you** badge on an evening slot, with the line "Suggested based on when you usually collect." A greyed, struck-through slot says **Fully booked**.
4. Tap a suggested slot. The sticky bar shows the choice. Tap **Confirm slot**.
5. The pass appears: animated tick, **large QR**, **6-digit OTP**, a live **"Starts in ..."** countdown.

Say: "Two things worth knowing. The suggestion is a recency-weighted histogram of her past pickup hours, with a fallback to the quietest slot for new users. And capacity is enforced with one atomic database update, so two people tapping the last seat at the same moment cannot both get it." (If asked: that concurrency test is written; it needs MongoDB to run.)

### 2:50 to 3:20. Share with a neighbour (Window A)

1. Tap **Share with neighbour**. Type `Meera Iyer`. Tap **Create code**.
2. A 6-character code appears with **Share** and **Copy code**. Close the dialog.
3. Tap **Add to calendar** (downloads an .ics file). Mention it only.

Say: "She is not home, so she delegates. The code works once, expires with the slot, and the guard sees the neighbour's name."

### 3:20 to 4:10. Handover: success, reuse, failure (Window B)

1. Guard: tap **Handover**. (On a phone with a camera, scan the QR on Window A: the screen turns green. **If the camera is unavailable the screen automatically switches to Enter code**; that is your fallback, not a failure.)
2. **Enter code** tab: Flat `A-1204`, OTP = the 6 digits from Window A. Tap **Verify and hand over**.
3. Full-screen green **Release the parcel**, with the courier and shelf. Tap **Next parcel**.
4. Enter the **same OTP again**: full-screen red **Do not release**.
5. Optional (full-stack seed only): in Window A open **Home** -> the already-booked Amazon card -> **View pass**. Under **Shared pickup codes** Meera's code is listed. In Window B switch the code type to **Neighbour code**, enter flat `A-1204` and that code: the green screen says **Collected by Meera Iyer**.

Say: "Each OTP works exactly once, even if two guards scan at the same instant. Five wrong guesses lock the booking. The OTP is never stored in the database: it is derived from a server secret and a random value, so a database leak does not reveal it. Guards and admins never receive OTPs at all."

### 4:10 to 4:30. Guard's schedule (Window B)

Tap **Today**: slot-wise list, **Now** badge on the current hour, finished slots collapsed behind **Show earlier slots**, **Hand over** shortcuts next to each pending pickup.

### 4:30 to 5:00. Admin view and finish (Window B, new tab as admin)

1. Sign in as `admin@slotdrop.in`. **Dashboard**: four KPI tiles with change vs the previous period, **Parcels per day** line, **Peak handover hours** bars. Hover the line chart for the tooltip. Tap **Table** on a chart to show the same numbers as a table. Tap **Last 30 days**: everything rescopes together.
2. Scroll to **Slot capacity**: pick a day. Show the minus button is **disabled where bookings already exist**. Tap the lock on one slot to **close** it.
3. Back in Window A (resident), open the slot picker for the same day: the closed slot shows **Closed by society office**.
4. Finish with the **theme toggle** (on the **Account** page, and on the login screen): dark mode, same screens.

Say: "Every status change is in an append-only audit log. The app scores 100 on Lighthouse accessibility on every screen in both themes. Happy to take questions."

---

## If something goes wrong

| Problem | What to do |
|---|---|
| Camera scan fails / no camera | The Handover screen already falls back to **Enter code**. Say: "Scanning is the fast path; typing the code is the fallback, which is also how a resident without a smartphone would do it." |
| New parcel does not appear live | Reload Window A once. Mention WebSockets reconnect. If it persists, switch to the mock-mode fallback |
| Server asleep / slow first load | Wait 30 to 60 seconds on a free host. This is why you open it early |
| Slot you wanted is full | Pick another; this shows the "just filled up" handling. If you want to show it deliberately, tomorrow 6 to 7 PM is seeded with only 2 seats and is already full |
| OTP rejected unexpectedly | Check the flat number, and that you are using the OTP from the *latest* booking. After five wrong tries the flat's live bookings lock: cancel and rebook (resident side) |
| Total failure | Switch to mock mode (`VITE_API_MODE=mock`), reset its data, and run the same script |

## Questions to expect after the demo

Skim [viva-qa.md](viva-qa.md). The three most likely: "How do you stop overbooking?", "Where is the OTP stored?", "What did you actually test?" (answer honestly: the logic and the whole UI are covered; the concurrency and database tests are written and need to be run on a machine with MongoDB, and you have/have not run them yet).
