// All society time is IST. Intl handles the conversion, so no date library is needed.
const TZ = 'Asia/Kolkata';
const fmt = (opts) => new Intl.DateTimeFormat('en-IN', { timeZone: TZ, ...opts });

const dateKey = (d = new Date()) => fmt({ year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d)).split('/').reverse().join('-');
const hourOf = (d) => Number(fmt({ hour: 'numeric', hour12: false }).format(new Date(d))) % 24;
const clock = (d) => fmt({ hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(d)).replace(/\s?([ap])m/i, (_, x) => ` ${x.toUpperCase()}M`);

export function addDaysKey(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** "Today", "Tomorrow", or "Wed, 4 Nov" for a YYYY-MM-DD key. */
export function dayLabel(key) {
  const today = dateKey();
  if (key === today) return 'Today';
  if (key === addDaysKey(today, 1)) return 'Tomorrow';
  if (key === addDaysKey(today, -1)) return 'Yesterday';
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${key}T00:00:00Z`));
}

export const weekday = (key) => new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: 'short' }).format(new Date(`${key}T00:00:00Z`));
export const dayNumber = (key) => Number(key.slice(8));

/** "9–10 AM" when both ends share AM/PM, else "11 AM–12 PM". */
export function slotRange(startsAt, endsAt) {
  const [s, e] = [clock(startsAt), clock(endsAt)];
  const [sT, sM] = s.split(' ');
  const [eT, eM] = e.split(' ');
  const strip = (t) => t.replace(':00', '');
  return sM === eM ? `${strip(sT)}–${strip(eT)} ${eM}` : `${strip(sT)} ${sM}–${strip(eT)} ${eM}`;
}

export const receivedLabel = (d) => `${dayLabel(dateKey(d))}, ${clock(d)}`;
export const slotLong = (startsAt, endsAt) => `${dayLabel(dateKey(startsAt))}, ${slotRange(startsAt, endsAt)}`;
export const timeOnly = clock;

export function greeting(name = '') {
  const h = hourOf(new Date());
  const word = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${word}, ${name.split(' ')[0]}`;
}

/** 2h 14m / 14m 05s / now */
export function countdown(ms) {
  if (ms <= 0) return 'now';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m ${String(s % 60).padStart(2, '0')}s`;
}

export { dateKey };
