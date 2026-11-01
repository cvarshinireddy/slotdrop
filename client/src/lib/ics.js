// Builds a minimal RFC 5545 calendar file so "Add to calendar" works on every phone/desktop with no library.
const stamp = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s) => String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');

export function buildIcs({ id, startsAt, endsAt, courier }) {
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SlotDrop//EN', 'BEGIN:VEVENT',
    `UID:${id}@slotdrop`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(startsAt)}`, `DTEND:${stamp(endsAt)}`,
    `SUMMARY:${esc(`Collect ${courier} parcel`)}`, `DESCRIPTION:${esc('Show your SlotDrop QR or OTP to the guard at the gate.')}`,
    'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:Parcel handover in 30 minutes', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(booking) {
  const url = URL.createObjectURL(new Blob([buildIcs(booking)], { type: 'text/calendar' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'slotdrop-handover.ics' });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
