// Verifies WCAG AA contrast for the token pairs we actually use, in light AND dark.
// Usage: npm run check:contrast   (exit code 1 if any pair fails)
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

function parseBlock(selector) {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf('}', start));
  const vars = {};
  for (const m of body.matchAll(/--([\w-]+):\s*(\d+(?:\.\d+)?) (\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%;/g)) {
    vars[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return vars;
}

function hslToRgb([h, s, l]) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => v * 255);
}
const lum = (hsl) => {
  const [r, g, b] = hslToRgb(hsl).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// [foreground, background, minimum ratio, note]. 4.5 = normal text, 3 = large text / UI graphics.
const PAIRS = [
  ['foreground', 'background', 4.5], ['foreground', 'surface', 4.5], ['foreground', 'surface-2', 4.5],
  ['muted-foreground', 'background', 4.5], ['muted-foreground', 'surface', 4.5], ['muted-foreground', 'surface-2', 4.5],
  ['primary-foreground', 'primary', 4.5], ['primary-soft-foreground', 'primary-soft', 4.5],
  ['primary', 'background', 4.5], ['primary', 'surface', 4.5], ['ring', 'background', 3], ['ring', 'surface', 3],
  ...['received', 'booked', 'delivered', 'overdue'].flatMap((s) => [
    [`status-${s}-fg`, `status-${s}-bg`, 4.5],
    [`status-${s}`, 'surface', 3],
    [`status-${s}-border`, `status-${s}-bg`, 1.2],
  ]),
  ['qr-fg', 'qr-bg', 7],
];

const light = parseBlock(':root');
const dark = { ...light, ...parseBlock('.dark') };
let failed = 0;
for (const [name, theme] of [['light', light], ['dark', dark]]) {
  for (const [fg, bg, min] of PAIRS) {
    if (!theme[fg] || !theme[bg]) { console.log(`MISSING ${name}: ${fg} / ${bg}`); failed++; continue; }
    const r = ratio(theme[fg], theme[bg]);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name.padEnd(5)} ${fg.padEnd(26)} on ${bg.padEnd(22)} ${r.toFixed(2)} (min ${min})`);
  }
}
console.log(failed ? `\n${failed} pair(s) failed` : '\nAll pairs meet WCAG AA');
process.exit(failed ? 1 : 0);
