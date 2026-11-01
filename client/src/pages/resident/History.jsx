import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardTitle, CourierBadge, EmptyState, ParcelCardSkeleton, Skeleton, StatusChip, Stepper, toChipStatus, Button } from '@/components/ui';
import { useParcels } from '@/context/ParcelsContext';
import { api } from '@/lib/api';
import { receivedLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

const ORDER = [
  ['RECEIVED', 'Received at the gate'],
  ['SLOT_BOOKED', 'Slot booked'],
  ['DELEGATED', 'Shared with a neighbour'],
  ['DELIVERED', 'Handed over'],
];

// Turns audit-log entries into stepper steps. Optional steps (DELEGATED) only show if they happened.
function toSteps(timeline) {
  const byAction = Object.fromEntries(timeline.map((t) => [t.action, t]));
  const rows = ORDER.filter(([a]) => a !== 'DELEGATED' || byAction[a]);
  const firstTodo = rows.findIndex(([a]) => !byAction[a]);
  return rows.map(([action, label], i) => ({
    key: action, label,
    detail: byAction[action] ? receivedLabel(byAction[action].at) : i === firstTodo ? 'Up next' : undefined,
    state: byAction[action] ? 'done' : i === firstTodo ? 'current' : 'todo',
  }));
}

function HistoryItem({ parcel }) {
  const [open, setOpen] = useState(false);
  const [timeline, setTimeline] = useState(null);
  const [failed, setFailed] = useState(false);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !timeline) api.parcelTimeline(parcel._id).then(setTimeline).catch(() => setFailed(true));
  }
  const panelId = `tl-${parcel._id}`;
  return (
    <Card as="article" animate className="p-0">
      <button onClick={toggle} aria-expanded={open} aria-controls={panelId} className="flex min-h-tap w-full items-center gap-3 rounded-2xl p-4 text-left">
        <CourierBadge courier={parcel.courier} className="size-12 rounded-xl text-base" />
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-base">{parcel.courier}</CardTitle>
          <p className="text-xs text-muted-foreground">Received {receivedLabel(parcel.receivedAt)}</p>
        </div>
        <StatusChip status={toChipStatus(parcel.status, parcel.isOverdue)} />
        <ChevronDown className={cn('size-5 shrink-0 text-muted-foreground transition-transform duration-base', open && 'rotate-180')} aria-hidden />
      </button>
      <div id={panelId} hidden={!open} className="border-t border-border p-4">
        {!timeline && !failed && <div role="status" aria-label="Loading timeline" className="space-y-3"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-6 w-1/2" /></div>}
        {failed && <p className="text-sm text-status-overdue-fg">Could not load the timeline. Close and reopen to retry.</p>}
        {timeline && <Stepper steps={toSteps(timeline)} />}
      </div>
    </Card>
  );
}

export default function History() {
  const { parcels, status, refresh } = useParcels();
  return (
    <div className="space-y-6">
      <header><h1 className="text-3xl font-bold">History</h1><p className="mt-1 text-muted-foreground">Every parcel, from the gate to your hands.</p></header>
      {status === 'loading' && <div className="space-y-4"><ParcelCardSkeleton /><ParcelCardSkeleton /></div>}
      {status === 'error' && <Card><EmptyState illustration="error" title="Could not load your history" action={<Button variant="secondary" onClick={() => refresh()}>Try again</Button>} /></Card>}
      {status === 'ready' && parcels.length === 0 && <Card><EmptyState illustration="noHistory" title="No parcels yet" description="Your parcels and their journey will show up here." /></Card>}
      {status === 'ready' && parcels.length > 0 && <ul className="space-y-3">{parcels.map((p) => <li key={p._id}><HistoryItem parcel={p} /></li>)}</ul>}
    </div>
  );
}
