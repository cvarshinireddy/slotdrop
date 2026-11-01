// Screenshots + automated checks for a route at 375px and 1280px, light and dark.
// Usage: node scripts/shots.cjs /design-system outDir
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

const route = process.argv[2] || '/design-system';
const out = process.argv[3] || '/tmp/shots';
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  let problems = 0;
  for (const [vw, vh] of [[375, 812], [1280, 800]]) {
    for (const theme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, colorScheme: theme });
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(`http://127.0.0.1:5173${route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      const report = await page.evaluate(() => {
        const overflow = document.documentElement.scrollWidth > window.innerWidth + 1;
        const small = [...document.querySelectorAll('button, a, input, [role=button]')]
          .filter((el) => el.offsetParent !== null)
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width > 0 && (r.height < 43.5 || r.width < 43.5))
          .map(({ el, r }) => `${el.tagName} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
        const noName = [...document.querySelectorAll('button')].filter((b) => !(b.textContent.trim() || b.getAttribute('aria-label'))).length;
        return { overflow, small, noName, dark: document.documentElement.classList.contains('dark'), fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family) };
      });
      const tag = `${vw}-${theme}`;
      console.log(`[${tag}] dark-class=${report.dark} overflowX=${report.overflow} unnamedButtons=${report.noName} consoleErrors=${errors.length}`);
      if (report.small.length) console.log('  small tap targets:', report.small);
      if (errors.length) console.log('  errors:', errors);
      if (report.overflow || report.small.length || errors.length || report.noName) problems++;
      await page.screenshot({ path: path.join(out, `${tag}.png`), fullPage: true });
      await ctx.close();
    }
  }
  await browser.close();
  console.log(problems ? `\n${problems} view(s) with problems` : '\nAll views clean');
})();
