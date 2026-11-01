// End-to-end regression run against the MOCK API (no server needed):
//   VITE_API_MODE=mock npx vite --host 127.0.0.1 &  node scripts/e2e-mock.cjs
const { chromium } = require('playwright');
const fs = require('node:fs');
const BASE = 'http://127.0.0.1:5173';
const OUT = process.argv[2] || '/tmp/e2e';
fs.mkdirSync(OUT, { recursive: true });
let fails = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!ok) fails++; };

// Polls until the condition holds (UI updates after a save arrive after a refetch, so one-shot reads are racy).
async function eventually(fn, timeout = 6000) {
  const end = Date.now() + timeout;
  for (;;) { try { if (await fn()) return true; } catch { /* retry */ } if (Date.now() > end) return false; await new Promise((r) => setTimeout(r, 100)); }
}

async function audit(page, tag) {
  const r = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    small: [...document.querySelectorAll('button, a, input:not([type=file]), [role=tab], [role=option]')]
      .filter((el) => el.offsetParent !== null && !el.closest('[aria-hidden=true]'))
      .map((el) => [el, el.getBoundingClientRect()]).filter(([, b]) => b.width > 0 && (b.height < 43.5 || b.width < 43.5))
      .map(([el, b]) => `${el.tagName}:"${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 20)}" ${Math.round(b.width)}x${Math.round(b.height)}`),
  }));
  check(`${tag}: no horizontal overflow`, !r.overflow);
  check(`${tag}: tap targets >= 44px`, r.small.length === 0, r.small.join(' | '));
}

async function login(page, role) {
  await page.goto(`${BASE}/login`);
  await page.getByRole('button', { name: new RegExp(`^${role}`) }).click();
  await page.getByRole('button', { name: 'Sign in' }).click();
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, colorScheme: 'light' });
  const errors = [];
  const watch = (p, n) => { p.on('pageerror', (e) => errors.push(`${n}: ${e}`)); p.on('console', (m) => m.type() === 'error' && errors.push(`${n}: ${m.text()}`)); };

  // ---------- resident ----------
  const res = await ctx.newPage(); watch(res, 'resident');
  await res.goto(`${BASE}/login`);
  await res.evaluate(() => window.__slotdropMock?.reset && localStorage.removeItem('slotdrop-mock-db-v3'));
  await login(res, 'Resident');
  await res.getByRole('heading', { name: /^Good (morning|afternoon|evening), Priya/ }).waitFor();
  await res.waitForSelector('article');
  check('home: 3 parcels waiting', (await res.locator('article').count()) === 3);
  check('home: overdue chip for 75h-old parcel', (await res.getByText('Waiting 2+ days').count()) === 1);
  await audit(res, 'home');
  await res.screenshot({ path: `${OUT}/home-375.png`, fullPage: true });

  await res.locator('article', { hasText: 'Amazon' }).getByRole('link', { name: 'Choose a slot' }).click();
  await res.getByRole('heading', { name: 'Pick a time' }).waitFor();
  await res.getByRole('button', { name: 'Tomorrow' }).click();
  await res.waitForSelector('section[aria-labelledby=slots-h] button');
  check('picker: suggested badge visible', (await res.getByText('Suggested for you').count()) >= 1);
  check('picker: suggestion explained (history-based)', (await res.getByText('Suggested based on when you usually collect.').count()) === 1);
  check('picker: some slot disabled with reason', (await res.getByText('Fully booked').count()) >= 1);
  const firstOpen = res.locator('section[aria-labelledby=slots-h] button:not([aria-disabled])').first();
  await firstOpen.click();
  check('picker: sticky confirm bar appears', await res.getByRole('button', { name: 'Confirm slot' }).isVisible());
  await audit(res, 'picker');
  await res.screenshot({ path: `${OUT}/picker-375.png` });
  await res.getByRole('button', { name: 'Confirm slot' }).click();
  await res.waitForURL(/\/bookings\//);
  await res.getByRole('heading', { name: 'You are all set' }).waitFor();
  const otp = (await res.locator('p[aria-label^="One-time code"]').textContent()).trim();
  check('booking: 6-digit OTP shown', /^\d{6}$/.test(otp), otp);
  check('booking: QR image rendered', await res.locator('img[alt^="Handover QR"]').evaluate((i) => i.complete && i.naturalWidth > 0));
  check('booking: countdown shown', (await res.getByText(/Starts in/).count()) === 1);
  await audit(res, 'booking');
  await res.screenshot({ path: `${OUT}/booking-375.png`, fullPage: true });

  // delegate flow
  await res.getByRole('button', { name: 'Share with neighbour' }).click();
  await res.getByLabel('Who is collecting?').fill('Meera Iyer');
  await res.getByRole('button', { name: 'Create code' }).click();
  const dcode = (await res.locator('p[aria-label^="Pickup code"]').textContent()).trim();
  check('delegate: 6-char code created', /^[A-Z2-9]{6}$/.test(dcode), dcode);
  await res.keyboard.press('Escape');
  await res.getByText('Shared pickup codes').waitFor();

  // ---------- guard in a second tab (separate session token) ----------
  const g = await ctx.newPage(); watch(g, 'guard');
  await login(g, 'Guard');
  await g.waitForURL(/\/guard\/log/);
  await g.getByRole('heading', { name: 'Log a parcel' }).waitFor();
  const t0 = Date.now();
  await g.getByRole('combobox').fill('A-12');
  await g.waitForSelector('[role=option]');
  await g.keyboard.press('Enter');
  await g.getByRole('button', { name: 'Flipkart' }).click();
  await g.getByRole('button', { name: 'S-05' }).click();
  await audit(g, 'quicklog');
  await g.screenshot({ path: `${OUT}/quicklog-375.png`, fullPage: true });
  await res.goto(`${BASE}/`); await res.waitForSelector('article');
  await g.getByRole('button', { name: /Log Flipkart for A-1204/ }).click();
  await g.getByText(/Logged Flipkart for A-1204/).waitFor();
  check('quicklog: flat+courier+shelf+submit under 15s', Date.now() - t0 < 15000, `${Date.now() - t0}ms`);
  // realtime: resident tab updates without reload
  await res.waitForFunction(() => document.querySelectorAll('article').length === 4, null, { timeout: 5000 }).catch(() => {});
  check('realtime: new parcel appears on resident Home', (await res.locator('article').count()) === 4);
  check('realtime: toast announced', (await res.getByText('Your Flipkart parcel is at the gate').count()) >= 1);

  // ---------- handover ----------
  await g.getByRole('link', { name: 'Handover' }).click();
  await g.getByRole('heading', { name: 'Enter code' }).waitFor({ timeout: 8000 }); // headless: no camera -> falls back to code entry
  check('handover: camera-unavailable fallback message', (await g.getByText(/camera/i).count()) >= 1);
  await g.getByLabel('Flat number').fill('A-1204');
  await g.getByLabel('6-digit OTP').fill('000000');
  await g.getByRole('button', { name: 'Verify and hand over' }).click();
  await g.getByRole('heading', { name: 'Do not release' }).waitFor();
  check('handover: wrong OTP -> red failure', true);
  await g.screenshot({ path: `${OUT}/handover-fail-375.png` });
  await g.getByRole('button', { name: 'Try again' }).click();
  await g.getByLabel('6-digit OTP').fill(otp);
  await g.getByRole('button', { name: 'Verify and hand over' }).click();
  await g.getByRole('heading', { name: 'Release the parcel' }).waitFor();
  check('handover: correct OTP -> green success', true);
  await g.screenshot({ path: `${OUT}/handover-ok-375.png` });
  await g.getByRole('button', { name: 'Next parcel' }).click();
  await g.getByLabel('6-digit OTP').fill(otp);
  await g.getByRole('button', { name: 'Verify and hand over' }).click();
  await g.getByRole('heading', { name: 'Do not release' }).waitFor();
  check('handover: OTP cannot be reused', true);
  await g.getByRole('button', { name: 'Try again' }).click();
  await audit(g, 'handover-code');

  // delegate code at the gate: Priya books Flipkart (p2 is the older one) then guard uses the neighbour code
  await res.goto(`${BASE}/`); await res.waitForSelector('article');
  await res.locator('article', { hasText: 'Flipkart' }).first().getByRole('link', { name: 'Choose a slot' }).click();
  await res.getByRole('button', { name: 'Tomorrow' }).click();
  await res.waitForSelector('section[aria-labelledby=slots-h] button');
  await res.locator('section[aria-labelledby=slots-h] button:not([aria-disabled])').first().click();
  await res.getByRole('button', { name: 'Confirm slot' }).click();
  await res.getByRole('heading', { name: 'You are all set' }).waitFor();
  await res.getByRole('button', { name: 'Share with neighbour' }).click();
  await res.getByLabel('Who is collecting?').fill('Karan Malhotra');
  await res.getByRole('button', { name: 'Create code' }).click();
  const dc2 = (await res.locator('p[aria-label^="Pickup code"]').textContent()).trim();
  await g.getByRole('button', { name: 'Neighbour code' }).click();
  await g.getByLabel('6-character code').fill(dc2);
  await g.getByRole('button', { name: 'Verify and hand over' }).click();
  await g.getByRole('heading', { name: 'Release the parcel' }).waitFor();
  check('handover: delegate code -> success naming the neighbour', (await g.getByRole('alert').first().innerText()).includes('Collected by Karan Malhotra'));
  await g.getByRole('button', { name: 'Next parcel' }).click();

  // schedule
  await g.getByRole('link', { name: 'Today' }).click();
  await g.getByRole('heading', { name: /Today.s handovers/ }).waitFor();
  await g.waitForSelector('ol li');
  check('schedule: slot-wise list rendered', (await g.locator('ol > li').count()) >= 10);
  await audit(g, 'schedule');
  await g.screenshot({ path: `${OUT}/schedule-375.png`, fullPage: true });

  // ---------- resident history + notifications ----------
  await res.keyboard.press('Escape');
  await res.goto(`${BASE}/history`);
  await res.waitForSelector('article');
  await res.locator('article').first().getByRole('button').click();
  await res.waitForSelector('ol[aria-label="Parcel progress"] li');
  check('history: timeline stepper expands', (await res.locator('ol[aria-label="Parcel progress"] li').count()) >= 3);
  await audit(res, 'history');
  await res.screenshot({ path: `${OUT}/history-375.png`, fullPage: true });
  await res.getByRole('button', { name: /Notifications/ }).first().click();
  await res.getByRole('dialog').getByText('Your Flipkart parcel is at the gate').first().waitFor();
  check('notifications panel lists items', (await res.getByRole('dialog').locator('li').count()) >= 3);
  await res.screenshot({ path: `${OUT}/notifications-375.png` });
  await res.keyboard.press('Escape');

  // ---------- role protection ----------
  await res.goto(`${BASE}/guard/log`);
  await res.waitForURL(`${BASE}/`);
  check('RBAC: resident bounced from guard route', true);


  // ---------- admin dashboard ----------
  const a = await ctx.newPage(); watch(a, 'admin');
  await login(a, 'Admin');
  await a.getByRole('heading', { name: 'Dashboard', level: 1 }).waitFor();
  await a.waitForSelector('svg.recharts-surface');
  await a.waitForTimeout(400);
  check('admin: 4 KPI tiles', (await a.getByText(/^(Parcels received|Delivered|Avg pickup time|Uncollected now)$/).count()) === 4);
  check('admin: both charts rendered', (await a.locator('svg.recharts-surface').count()) >= 2);
  const lineSvg = a.locator('section', { hasText: 'Parcels per day' }).locator('svg.recharts-surface').first();
  await lineSvg.scrollIntoViewIfNeeded(); await a.evaluate(() => window.scrollBy(0, 150)); // keep the hover point clear of the fixed tab bar
  const lineBox = await lineSvg.boundingBox();
  await a.mouse.move(lineBox.x + lineBox.width * 0.6, lineBox.y + lineBox.height * 0.5);
  await a.waitForTimeout(250);
  check('admin: line chart tooltip on hover (value leads)', /parcels?/.test(await a.locator('.recharts-tooltip-wrapper').first().innerText()));
  await a.screenshot({ path: `${OUT}/admin-375.png`, fullPage: true });
  await audit(a, 'admin');
  // table view = same numbers without hover
  await a.locator('section', { hasText: 'Parcels per day' }).getByRole('button', { name: 'Table' }).click();
  check('admin: table view shows 14 days', (await a.locator('section', { hasText: 'Parcels per day' }).locator('tbody tr').count()) === 14);
  await a.getByRole('button', { name: 'Last 30 days' }).click();
  await a.waitForFunction(() => document.querySelectorAll('section tbody tr').length === 30, null, { timeout: 5000 }).catch(() => {});
  check('admin: date range filter rescopes the chart (30 rows)', (await a.locator('section', { hasText: 'Parcels per day' }).locator('tbody tr').count()) === 30);
  check('admin: filter button exposes pressed state', (await a.getByRole('button', { name: 'Last 30 days' }).getAttribute('aria-pressed')) === 'true');
  await a.locator('section', { hasText: 'Parcels per day' }).getByRole('button', { name: 'Chart' }).click();
  check('admin: uncollected list populated', (await a.locator('section', { hasText: 'Uncollected parcels' }).locator('li').count()) >= 1);

  // capacity manager: a full slot cannot be reduced below its bookings; changes reach residents
  const cap = a.locator('section', { hasText: 'Slot capacity' });
  await cap.getByRole('group', { name: 'Choose a day' }).getByRole('button').nth(1).click();
  await cap.locator('li').first().waitFor();
  check('capacity: stepper blocks going below booked seats', (await cap.locator('button[aria-label="Decrease capacity"]:disabled').count()) >= 1);
  const row = cap.locator('li').nth(1);
  const before = Number((await row.locator('span.tabular-nums').textContent()).trim());
  await row.getByRole('button', { name: 'Increase capacity' }).click();
  await a.waitForTimeout(500);
  check('capacity: increase applies', Number((await cap.locator('li').nth(1).locator('span.tabular-nums').textContent()).trim()) === before + 1);
  await cap.locator('li').nth(2).getByRole('button', { name: 'Close slot' }).click();
  await a.waitForTimeout(500);
  check('capacity: closed slot shows Closed badge', (await cap.getByText('Closed', { exact: true }).count()) === 1);
  // resident sees it immediately (same mock backend, other tab)
  await res.goto(`${BASE}/`); await res.waitForSelector('article');
  await res.locator('article', { hasText: 'Myntra' }).getByRole('link', { name: 'Choose a slot' }).click();
  await res.getByRole('button', { name: 'Tomorrow' }).click();
  await res.waitForSelector('section[aria-labelledby=slots-h] button');
  check('capacity: closed slot disabled for residents with reason', (await res.getByText('Closed by society office').count()) === 1);
  // windows editor: overlap blocked client-side, valid save works
  await cap.getByRole('button', { name: 'Edit windows' }).click();
  const dlg = a.getByRole('dialog');
  await dlg.getByLabel('Window 2 start').waitFor();
  await dlg.getByLabel('Window 2 start').fill('09:30');
  check('windows: overlap shows error and disables save', (await dlg.getByText('Time windows must not overlap.').count()) === 1 && await dlg.getByRole('button', { name: 'Save windows' }).isDisabled());
  await dlg.getByLabel('Window 2 start').fill('10:00');
  await dlg.getByLabel('Window 1 capacity').fill('5');
  await dlg.getByRole('button', { name: 'Save windows' }).click();
  await a.getByText('Time windows saved').waitFor();
  check('windows: valid edit saves', true);


  // ---------- admin: people & flats ----------
  await a.getByRole('link', { name: 'People' }).click();
  await a.getByRole('heading', { name: 'People and flats' }).waitFor();
  await a.locator('ul > li').first().waitFor();
  check('users: 13 people listed (1 admin, 2 guards, 10 residents)', (await a.locator('ul > li').count()) === 13);
  await audit(a, 'users');
  await a.screenshot({ path: `${OUT}/users-375.png` });
  await a.getByRole('button', { name: 'Guards' }).click();
  check('users: role filter shows 2 guards', (await a.locator('ul > li').count()) === 2);
  await a.getByRole('button', { name: 'Everyone' }).click();
  check('users: own account cannot be deactivated', await a.getByRole('switch', { name: /Anita Deshmukh/ }).isDisabled());

  await a.getByRole('button', { name: 'Add person' }).click();
  let dlg2 = a.getByRole('dialog');
  await dlg2.getByLabel('Full name').fill('Neha Kapoor');
  await dlg2.getByLabel('Email').fill('priya.sharma@slotdrop.in'); // already taken
  await dlg2.getByLabel('Mobile').fill('9876543210');
  await dlg2.getByLabel('Flat').selectOption({ label: 'A-0604' });
  await dlg2.getByRole('button', { name: 'Create account' }).click();
  await dlg2.getByRole('alert').waitFor();
  check('users: duplicate email rejected with a clear message', /already in use/.test(await dlg2.getByRole('alert').innerText()));
  await dlg2.getByLabel('Email').fill('neha.kapoor@example.in');
  await dlg2.getByRole('button', { name: 'Create account' }).click();
  await dlg2.getByRole('heading', { name: 'Account created' }).waitFor();
  const tempPw = (await dlg2.locator('dd.font-mono').textContent()).trim();
  check('users: temporary password generated (10+ chars)', tempPw.length >= 10, tempPw.length + ' chars');
  await dlg2.getByRole('button', { name: 'Done' }).click();
  check('users: new person appears in the list', await eventually(async () => (await a.locator('ul > li').filter({ hasText: 'Neha Kapoor' }).count()) === 1));

  // the new account works...
  const n = await ctx.newPage(); watch(n, 'newuser');
  await n.goto(`${BASE}/login`);
  await n.getByLabel('Email or mobile').fill('neha.kapoor@example.in');
  await n.getByLabel('Password', { exact: true }).fill(tempPw);
  await n.getByRole('button', { name: 'Sign in' }).click();
  await n.getByRole('heading', { name: /^Good (morning|afternoon|evening), Neha/ }).waitFor();
  check('users: new resident can sign in and sees the empty state', await eventually(async () => (await n.getByText('Nothing waiting at the gate').count()) >= 1));
  // ...until an admin deactivates it
  await a.getByRole('switch', { name: /Neha Kapoor/ }).click();
  await a.getByText('Neha Kapoor deactivated').waitFor();
  const n2 = await ctx.newPage(); watch(n2, 'deactivated');
  await n2.goto(`${BASE}/login`);
  await n2.getByLabel('Email or mobile').fill('neha.kapoor@example.in');
  await n2.getByLabel('Password', { exact: true }).fill(tempPw);
  await n2.getByRole('button', { name: 'Sign in' }).click();
  await n2.getByRole('alert').waitFor();
  check('users: deactivated account cannot sign in', /incorrect/.test(await n2.getByRole('alert').innerText()));
  await n.reload();
  await n.waitForURL(/\/login/);
  check('users: deactivated session is signed out on next load', true);

  // flats
  await a.getByRole('tab', { name: 'Flats' }).click();
  await a.waitForSelector('ul.grid > li');
  check('flats: 14 flats listed', (await a.locator('ul.grid > li').count()) === 14);
  check('flats: vacant flats are labelled (3 left after assigning one)', (await a.getByText('Vacant', { exact: true }).count()) === 3);
  await a.getByRole('button', { name: 'Add flat' }).click();
  const fd = a.getByRole('dialog');
  await fd.getByLabel('Flat number').fill('E-0101');
  await fd.getByRole('button', { name: 'Add flat' }).click();
  await a.getByText('Flat E-0101 added').waitFor();
  check('flats: new flat appears', await eventually(async () => (await a.locator('ul.grid > li').count()) === 15));
  await a.screenshot({ path: `${OUT}/flats-375.png` });

  // role protection for admin pages
  await res.goto(`${BASE}/admin`);
  await res.waitForURL(`${BASE}/`);
  check('RBAC: resident bounced from admin dashboard', true);

  // ---------- desktop + dark ----------
  const d = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
  const dp = await d.newPage(); watch(dp, 'desktop');
  await login(dp, 'Resident');
  await dp.waitForSelector('article');
  check('desktop: sidebar visible, bottom tabs hidden', (await dp.locator('aside').isVisible()) && !(await dp.locator('nav[aria-label=Main]').last().isVisible()));
  await audit(dp, 'desktop-home');
  await dp.screenshot({ path: `${OUT}/home-1280-dark.png` });
  await dp.goto(`${BASE}/history`); await dp.waitForSelector('article');
  await dp.screenshot({ path: `${OUT}/history-1280-dark.png` });
  const dg = await d.newPage(); watch(dg, 'desktop-guard');
  await login(dg, 'Guard'); await dg.waitForURL(/guard\/log/);
  await dg.screenshot({ path: `${OUT}/quicklog-1280-dark.png` });
  await dg.goto(`${BASE}/guard/schedule`); await dg.waitForSelector('ol li');
  await dg.screenshot({ path: `${OUT}/schedule-1280-dark.png`, fullPage: true });
  const da = await d.newPage(); watch(da, 'desktop-admin');
  await login(da, 'Admin'); await da.waitForSelector('svg.recharts-surface'); await da.waitForTimeout(500);
  await audit(da, 'desktop-admin');
  await da.screenshot({ path: `${OUT}/admin-1280-dark.png`, fullPage: true });

  const real = errors.filter((e) => !/getUserMedia|NotFoundError|NotAllowedError|Requested device not found|Permission/i.test(e));
  check('no console/page errors', real.length === 0, real.slice(0, 3).join(' | '));
  await browser.close();
  console.log(fails ? `\n${fails} check(s) failed` : '\nAll checks passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(2); });
