import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ScanLine } from 'lucide-react';
import { Button, Card, CourierBadge, EmptyState, Skeleton } from '@/components/ui';
import { api, connectRealtime } from '@/lib/api';
import { slotRange } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function Schedule() {
  const [slots, setSlots] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => api.todaySchedule().then((s) => { setSlots(s); setError(false); }).catch(() => setError(true)), []);
  useEffect(() => { load(); return connectRealtime({ 'parcel:updated': load, 'slot:updated': load }); }, [load]);

  const now = Date.now();
  const booked = slots?.reduce((n, s) => n + s.bookings.length, 0) ?? 0;

  return (
    <div className="space-y-6">
      <header><h1 className="text-3xl font-bold">Today&apos;s handovers</h1>
        <p className="mt-1 text-muted-foreground" aria-live="polite">{slots ? `${booked} pending ${booked === 1 ? 'pickup' : 'pickups'} across today's slots` : 'Loading the schedule…'}</p></header>

      {error && <Card><EmptyState illustration="error" title="Could not load the schedule" action={<Button variant="secondary" onClick={load}>Try again</Button>} /></Card>}
      {!slots && !error && <div className="space-y-3" role="status" aria-label="Loading schedule">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>}
      {slots && slots.length === 0 && <Card><EmptyState illustration="noHistory" title="No slots today" description="The society office has not opened slots for today." /></Card>}

      {slots && slots.length > 0 && (
        <ol className="space-y-3">
          {slots.map((s) => {
            const current = new Date(s.startsAt) <= now && new Date(s.endsAt) > now;
            const past = new Date(s.endsAt) <= now;
            return (
              <li key={s._id} aria-current={current ? 'time' : undefined}>
                <Card className={cn('space-y-3', past && 'opacity-60', current && 'border-primary ring-2 ring-primary/20')}>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-display text-xl font-semibold">{slotRange(s.startsAt, s.endsAt)}{current && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 align-middle text-xs font-semibold text-primary-foreground">Now</span>}</h2>
                    <p className="text-sm text-muted-foreground">{s.booked}/{s.capacity} booked</p>
                  </div>
                  {s.bookings.length === 0 ? <p className="text-sm text-muted-foreground">No pickups scheduled.</p> : (
                    <ul className="divide-y divide-border">
                      {s.bookings.map((b) => (
                        <li key={b._id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                          <CourierBadge courier={b.parcelId.courier} className="size-11 rounded-xl text-sm" />
                          <div className="min-w-0 flex-1"><p className="font-display text-lg font-semibold">{b.parcelId.flatId.number}</p><p className="truncate text-sm text-muted-foreground">{b.parcelId.courier}{b.parcelId.shelfId ? ` · Shelf ${b.parcelId.shelfId}` : ''}</p></div>
                          <Link to="/guard/handover" state={{ flat: b.parcelId.flatId.number }} className="flex min-h-tap items-center gap-2 rounded-2xl bg-primary-soft px-4 text-sm font-semibold text-primary-soft-foreground hover:bg-primary-soft/70"><ScanLine className="size-4" aria-hidden />Hand over</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
