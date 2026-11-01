// Lighthouse accessibility audit of every screen, in light AND dark, at 375px and 1280px.
// Lighthouse cannot log in on its own, so we drive a real browser session (mock API) and run Lighthouse's
// *snapshot* mode on the current DOM of each screen/state.
//   VITE_API_MODE=mock npx vite --host 127.0.0.1 &   then   node scripts/lighthouse-a11y.mjs [--threshold 95]
import puppeteer from 'puppeteer-core';
import { startFlow } from 'lighthouse';

const BASE = 'http://127.0.0.1:5173';
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium';
const threshold = Number(process.argv[process.argv.indexOf('--threshold') + 1]) || 95;
const arg = (n) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : undefined; };
const onlyRole = arg('--role'); const onlyWidth = Number(arg('--width')) || null; const onlyTheme = arg('--theme');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const clickText = async (page, selector, pattern) => {
  const el = await page.evaluateHandle((sel, p) => [...document.querySelectorAll(sel)].filter((e) => e.getClientRects().length > 0).find((e) => [e.textContent, e.getAttribute('aria-label')].some((t) => new RegExp(p).test((t || '').trim()))), selector, pattern);
  if (!el.asElement()) throw new Error(`No ${selector} matching /${pattern}/ on ${page.url()}`);
  await el.asElement().evaluate((n) => n.scrollIntoView({ block: 'center' })); // fixed bars can cover edge-scrolled elements
  await el.asElement().click();
};
const waitFor = (page, sel) => page.waitForSelector(sel, { timeout: 8000 });
const login = async (page, role) => {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  await clickText(page, 'button', `^${role}`);
  await clickText(page, 'button', '^Sign in$');
  await sleep(900);
};
const go = async (page, path, sel) => { await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle0' }); if (sel) await waitFor(page, sel); await sleep(500); };

// Each scenario: [name, async (page, snap) => void]. `snap(label)` takes an accessibility snapshot of the current DOM.
const SCENARIOS = {
  public: [
    ['login', async (p, snap) => { await go(p, '/login'); await snap('Login'); }],
    ['design-system', async (p, snap) => { await go(p, '/design-system', 'main'); await snap('Design system'); }],
  ],
  Resident: [
    ['home', async (p, snap) => { await waitFor(p, 'article'); await snap('Resident home'); }],
    ['notifications', async (p, snap) => { await clickText(p, 'button', 'Notifications'); await waitFor(p, '[role=dialog]'); await sleep(400); await snap('Notifications panel'); await p.keyboard.press('Escape'); await sleep(300); }],
    ['slot-picker', async (p, snap) => {
      await clickText(p, 'a', 'Choose a slot'); await waitFor(p, 'section[aria-labelledby=slots-h] button'); await sleep(400);
      await p.evaluate(() => document.querySelector('section[aria-labelledby=slots-h] button:not([aria-disabled])').click()); await sleep(500);
      await snap('Slot picker (selected)');
    }],
    ['booking', async (p, snap) => { await clickText(p, 'button', 'Confirm slot'); await waitFor(p, 'img[alt^="Handover QR"]'); await sleep(900); await snap('Booking pass'); await clickText(p, 'button', 'Share with neighbour'); await waitFor(p, '[role=dialog]'); await sleep(400); await snap('Share modal'); await p.keyboard.press('Escape'); await sleep(300); }],
    ['history', async (p, snap) => { await go(p, '/history', 'article'); await p.evaluate(() => document.querySelector('article button').click()); await waitFor(p, 'ol[aria-label="Parcel progress"] li'); await snap('History (expanded)'); }],
    ['account', async (p, snap) => { await go(p, '/account', 'h1'); await snap('Account'); }],
  ],
  Guard: [
    ['log', async (p, snap) => { await waitFor(p, '#flat'); await p.type('#flat', 'A-12'); await waitFor(p, '[role=option]'); await snap('Quick log (autocomplete open)'); }],
    ['handover', async (p, snap) => { await go(p, '/guard/handover', 'h1'); await sleep(1200); await snap('Handover (code entry)'); }],
    ['schedule', async (p, snap) => { await go(p, '/guard/schedule', 'ol li'); await snap('Today schedule'); }],
  ],
  Admin: [
    ['dashboard', async (p, snap) => { await waitFor(p, 'svg.recharts-surface'); await sleep(600); await snap('Admin dashboard'); }],
    ['users', async (p, snap) => { await go(p, '/admin/users', 'ul > li'); await snap('People'); await clickText(p, 'button', '^Add person$'); await waitFor(p, '[role=dialog]'); await sleep(400); await snap('Add person modal'); await p.keyboard.press('Escape'); await sleep(300); }],
  ],
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
const rows = []; const failures = new Map();

for (const [width, height] of [[375, 812], [1280, 800]].filter(([w]) => !onlyWidth || w === onlyWidth)) {
  for (const theme of ['light', 'dark'].filter((t) => !onlyTheme || t === onlyTheme)) {
    for (const [role, scenarios] of Object.entries(SCENARIOS).filter(([r]) => !onlyRole || r === onlyRole)) {
      const page = await browser.newPage();
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
      const flow = await startFlow(page, { config: { extends: 'lighthouse:default', settings: { onlyCategories: ['accessibility'], screenEmulation: { disabled: true }, formFactor: width < 600 ? 'mobile' : 'desktop' } } });
      // Toasts auto-dismiss with a fade. Measuring contrast mid-fade reports a washed-out colour that no user sees, so wait it out.
      const snap = async (name) => {
        await page.waitForFunction(() => !document.querySelector('.fixed.bottom-24 [role=status], .fixed.bottom-24 [role=alert]'), { timeout: 9000 }).catch(() => {});
        await sleep(300);
        await flow.snapshot({ name: `${name} · ${width}px ${theme}` });
      };
      try {
        if (role !== 'public') await login(page, role);
        for (const [step, run] of scenarios) { try { await run(page, snap); } catch (e) { throw new Error(`step "${step}": ${e.message}`); } }
      } catch (e) { console.error(`\nSCENARIO ERROR (${role}, ${width}px, ${theme}): ${e.message}`); process.exitCode = 2; }
      const result = await flow.createFlowResult();
      for (const step of result.steps) {
        const lhr = step.lhr; const score = Math.round((lhr.categories.accessibility.score ?? 0) * 100);
        rows.push({ name: step.name, score });
        for (const a of Object.values(lhr.audits).filter((x) => x.score !== null && x.score < 1 && x.scoreDisplayMode !== 'informative' && x.scoreDisplayMode !== 'notApplicable' && x.scoreDisplayMode !== 'manual')) {
          const nodes = (a.details?.items || []).slice(0, 3).map((i) => `${(i.node?.snippet || '').replace(/\s+/g, ' ').slice(0, 70)}  @ ${(i.node?.selector || '').slice(-90)}${i.subItems?.items?.[0]?.relatedNode ? '' : ''}  ${i.node?.explanation ? '· ' + i.node.explanation.replace(/\s+/g, ' ').slice(0, 160) : ''}`);
          const k = `${a.id}|${step.name}`;
          failures.set(k, { id: a.id, title: a.title, step: step.name, count: a.details?.items?.length ?? 0, nodes });
        }
      }
      await page.close();
    }
  }
}
await browser.close();

console.log('\nAccessibility score per screen (Lighthouse, snapshot mode)');
for (const r of rows) console.log(`${String(r.score).padStart(3)}  ${r.name}`);
const worst = Math.min(...rows.map((r) => r.score));
console.log(`\n${rows.length} snapshots, lowest score ${worst}, threshold ${threshold}`);
if (failures.size) {
  console.log('\nFailed audits');
  for (const f of failures.values()) console.log(`- [${f.id}] ${f.title} · ${f.step} · ${f.count} element(s)\n    ${f.nodes.join('\n    ')}`);
}
process.exit(worst >= threshold && !process.exitCode ? 0 : 1);
