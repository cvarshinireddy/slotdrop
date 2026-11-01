import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lock, LockOpen, Minus, Plus, Settings2 } from 'lucide-react';
import { Button, Card, EmptyState, Skeleton, useToast } from '@/components/ui';
import { WindowsModal } from './WindowsModal';
import { api } from '@/lib/api';
import { addDaysKey, dateKey, dayNumber, slotRange, weekday } from '@/lib/format';
import { cn } from '@/lib/utils';

const stepBtn = 'flex min-h-tap min-w-tap items-center justify-center rounded-xl border border-border bg-surface hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-40';

// Meter: the fill carries severity (accent -> amber -> red); the track is a lighter step of the accent.
function UtilisationMeter({ value }) {
  const tone = value >= 95 ? 'bg-status-overdue' : value >= 85 ? 'bg-status-received' : 'bg-primary';
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm"><span className="text-muted-foreground">Next 7 days</span><span className="font-semibold">{value}% booked</span></div>
      <div role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label="Slot utilisation for the next 7 days" className="mt-1.5 h-2 overflow-hidden rounded-full bg-primary-soft">
        <div className={cn('h-full rounded-full transition-[width] duration-base', tone)} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

export function SlotCapacityManager({ utilisation, onChanged }) {
  const { toast } = useToast();
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysKey(dateKey(), i)), []);
  const [day, setDay] = useState(days[0]);
  const [slots, setSlots] = useState(null);
  const [error, setError] = useState(false);
  const [windowsOpen, setWindowsOpen] = useState(false);

  // Responses can arrive out of order. Each load takes a ticket, and an edit bumps it, so a slow earlier fetch
  // can never overwrite a newer optimistic edit (or a different day) with stale data.
  const ticket = useRef(0);
  const load = useCallback(() => {
    const mine = ++ticket.current;
    setError(false);
    api.listSlots(day).then((list) => { if (mine === ticket.current) setSlots(list); }).catch(() => { if (mine === ticket.current) setError(true); });
  }, [day]);
  useEffect(() => { setSlots(null); load(); }, [load]);

  // Optimistic edit with rollback: the number moves instantly; if the server refuses (e.g. below booked seats) it snaps back.
  async function patch(slot, body) {
    const before = slots;
    ticket.current += 1; // invalidate any fetch still in flight
    setSlots((list) => list.map((s) => (s._id === slot._id ? { ...s, ...body, remaining: Math.max(0, (body.capacity ?? s.capacity) - s.booked) } : s)));
    try { await api.patchSlot(slot._id, body); onChanged?.(); load(); }
    catch (e) { setSlots(before); toast({ variant: 'error', title: 'Could not update slot', description: e.message }); }
  }

  const now = Date.now();
  return (
    <Card as="section" aria-labelledby="cap-h" className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div><h2 id="cap-h" className="text-xl font-semibold">Slot capacity</h2><p className="text-sm text-muted-foreground">Parcels per hour, per day.</p></div>
        <Button variant="secondary" leftIcon={Settings2} onClick={() => setWindowsOpen(true)}>Edit windows</Button>
      </header>
      {utilisation != null && <UtilisationMeter value={utilisation} />}

      <div role="group" aria-label="Choose a day" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {days.map((key) => (
          <button key={key} onClick={() => setDay(key)} aria-pressed={day === key} aria-label={key === days[0] ? 'Today' : `${weekday(key)} ${dayNumber(key)}`}
            className={cn('flex min-h-14 min-w-14 shrink-0 flex-col items-center justify-center rounded-2xl border px-2 text-xs transition-colors duration-fast', day === key ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface hover:bg-surface-2')}>
            <span className="opacity-80">{key === days[0] ? 'Today' : weekday(key)}</span><span className="font-display text-base font-semibold">{dayNumber(key)}</span>
          </button>
        ))}
      </div>

      {error && <EmptyState illustration="error" title="Could not load slots" action={<Button variant="secondary" onClick={load}>Try again</Button>} />}
      {!slots && !error && <div className="space-y-2" role="status" aria-label="Loading slots">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>}
      {slots?.length === 0 && <EmptyState illustration="noHistory" title="No slots on this day" description="Add a time window to open slots." />}
      {slots?.length > 0 && (
        <ul className="divide-y divide-border">
          {slots.map((s) => {
            const past = new Date(s.endsAt) <= now;
            const fill = s.capacity ? Math.round((s.booked / s.capacity) * 100) : 100;
            return (
              <li key={s._id} className={cn('flex items-center gap-3 py-3', past && 'opacity-50')}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{slotRange(s.startsAt, s.endsAt)}{s.isClosed && <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 align-middle text-xs font-medium text-muted-foreground">Closed</span>}</p>
                  <p className="text-xs text-muted-foreground">{s.booked} of {s.capacity} booked</p>
                  <div aria-hidden className="mt-1.5 h-1.5 w-full max-w-28 overflow-hidden rounded-full bg-primary-soft"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, fill)}%` }} /></div>
                </div>
                <div className="flex items-center gap-1" role="group" aria-label={`Capacity for ${slotRange(s.startsAt, s.endsAt)}`}>
                  <button className={stepBtn} aria-label="Decrease capacity" disabled={past || s.capacity <= s.booked} onClick={() => patch(s, { capacity: s.capacity - 1 })}><Minus className="size-4" aria-hidden /></button>
                  <span className="w-8 text-center font-display text-lg font-semibold tabular-nums" aria-live="polite">{s.capacity}</span>
                  <button className={stepBtn} aria-label="Increase capacity" disabled={past || s.capacity >= 100} onClick={() => patch(s, { capacity: s.capacity + 1 })}><Plus className="size-4" aria-hidden /></button>
                </div>
                <button className={stepBtn} aria-pressed={s.isClosed} aria-label={s.isClosed ? 'Reopen slot' : 'Close slot'} disabled={past} onClick={() => patch(s, { isClosed: !s.isClosed })}>
                  {s.isClosed ? <LockOpen className="size-4" aria-hidden /> : <Lock className="size-4" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <WindowsModal open={windowsOpen} onOpenChange={setWindowsOpen} onSaved={() => { load(); onChanged?.(); }} />
    </Card>
  );
}
