// All society time is Asia/Kolkata (UTC+5:30, no DST), so a fixed offset is safe and dependency-free.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// "2026-11-02" + "09:00" (IST) -> Date (UTC instant)
function istToDate(dateKey, hhmm) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - IST_OFFSET_MS);
}

// Date -> "YYYY-MM-DD" in IST
function toDateKey(date = new Date()) {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function addDays(dateKey, n) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

module.exports = { istToDate, toDateKey, addDays, IST_OFFSET_MS };
