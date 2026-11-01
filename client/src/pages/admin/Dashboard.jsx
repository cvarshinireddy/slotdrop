import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, EmptyState, Skeleton, StatTile } from '@/components/ui';
import { ParcelsPerDayChart } from '@/components/charts/ParcelsPerDayChart';
import { PeakHoursChart } from '@/components/charts/PeakHoursChart';
import { UncollectedList } from '@/components/admin/UncollectedList';
import { SlotCapacityManager } from '@/components/admin/SlotCapacityManager';
import { api, connectRealtime } from '@/lib/api';
import { cn } from '@/lib/utils';

const RANGES = [[7, 'Last 7 days'], [14, 'Last 14 days'], [30, 'Last 30 days']];

// Average pickup time, shown in the unit people think in: minutes, hours, then days.
function pickup(h) {
  if (h == null) return { value: null };
  if (h < 1) return { value: Math.max(1, Math.round(h * 60)), unit: 'min' };
  if (h < 48) return { value: h, unit: 'hrs' };
  return { value: Math.round((h / 24) * 10) / 10, unit: 'days' };
}

export default function Dashboard() {
  const [range, setRange] = useState(14);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [reloading, setReloading] = useState(false);
  const latest = useRef(0);

  // Refetch KEEPS the previous render (dimmed) instead of swapping to skeletons: no layout jump when the filter changes.
  const load = useCallback(async (r) => {
    const ticket = ++latest.current;
    setReloading(true);
    try { const d = await api.analytics(r); if (ticket === latest.current) { setData(d); setError(false); } }
    catch { if (ticket === latest.current) setError(true); }
    finally { if (ticket === latest.current) setReloading(false); }
  }, []);

  useEffect(() => { load(range); }, [range, load]);
  useEffect(() => connectRealtime({ 'parcel:updated': () => load(range), 'parcel:new': () => load(range) }), [range, load]);

  const k = data?.kpis;
  const avg = pickup(k?.avgPickupHours.value);
  const vs = `previous ${range} days`;

  return (
    <div className="space-y-6">
      <header><h1 className="text-3xl font-bold">Dashboard</h1><p className="mt-1 text-muted-foreground">How parcels are moving through the society.</p></header>

      {/* One filter row above everything it scopes: KPIs, both charts and the lists all follow it */}
      <div role="group" aria-label="Date range" className="flex flex-wrap gap-2">
        {RANGES.map(([r, label]) => (
          <button key={r} aria-pressed={range === r} onClick={() => setRange(r)}
            className={cn('min-h-tap rounded-2xl border px-4 text-sm font-medium transition-colors duration-fast', range === r ? 'border-primary bg-primary-soft text-primary-soft-foreground' : 'border-border bg-surface text-muted-foreground hover:bg-surface-2')}>
            {label}
          </button>
        ))}
      </div>

      {error && !data && <Card><EmptyState illustration="error" title="Could not load the dashboard" description="Check your connection and try again." action={<Button variant="secondary" onClick={() => load(range)}>Try again</Button>} /></Card>}
      {!data && !error && (
        <div className="space-y-4" role="status" aria-label="Loading dashboard">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
          <Skeleton className="h-72" /><Skeleton className="h-72" />
        </div>
      )}

      {data && (
        <div className="space-y-6" aria-busy={reloading}>
          {error && <p role="alert" className="rounded-2xl bg-status-received-bg p-3 text-sm text-status-received-fg">Showing the last loaded numbers. We could not refresh just now.</p>}
          <div className={cn('grid grid-cols-2 gap-3 transition-opacity duration-base lg:grid-cols-4', reloading && 'opacity-50')}>
            <StatTile label="Parcels received" value={k.received.value} delta={{ value: k.received.value, previous: k.received.previous, goodWhen: 'neutral', vs }} />
            <StatTile label="Delivered" value={k.delivered.value} delta={{ value: k.delivered.value, previous: k.delivered.previous, goodWhen: 'up', vs }} />
            <StatTile label="Avg pickup time" value={avg.value} unit={avg.unit} note="Gate to hand-over" delta={{ value: k.avgPickupHours.value, previous: k.avgPickupHours.previous, goodWhen: 'down', vs }} />
            <StatTile label="Uncollected now" value={k.uncollected} note={k.overdue ? `${k.overdue} overdue (2+ days)` : 'None overdue'} noteTone={k.overdue ? 'font-medium text-status-overdue-fg' : undefined} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ParcelsPerDayChart data={data.parcelsPerDay} reloading={reloading} />
            <PeakHoursChart data={data.peakHours} reloading={reloading} />
          </div>
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            <UncollectedList items={data.uncollected} total={k.uncollected} reloading={reloading} />
            <SlotCapacityManager utilisation={k.slotUtilisation.value} onChanged={() => load(range)} />
          </div>
        </div>
      )}
    </div>
  );
}
