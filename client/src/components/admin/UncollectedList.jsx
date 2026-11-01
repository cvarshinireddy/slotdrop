import { Card, CourierBadge, EmptyState, StatusChip, toChipStatus } from '@/components/ui';

const age = (h) => (h < 48 ? `${h}h` : `${Math.floor(h / 24)}d ${h % 24}h`);

export function UncollectedList({ items, total, reloading }) {
  return (
    <Card as="section" aria-labelledby="unc-h" aria-busy={reloading} className="space-y-3">
      <div>
        <h2 id="unc-h" className="text-xl font-semibold">Uncollected parcels</h2>
        <p className="text-sm text-muted-foreground">Oldest first. These need a nudge.</p>
      </div>
      {items.length === 0 ? <EmptyState illustration="noParcels" title="Nothing waiting at the gate" description="Every parcel has found its owner." /> : (
        <>
          <ul className={`divide-y divide-border transition-opacity duration-base ${reloading ? 'opacity-50' : ''}`}>
            {items.map((p) => (
              <li key={p._id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <CourierBadge courier={p.courier} className="size-11 rounded-xl text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-semibold leading-tight">{p.flat}</p>
                  <p className="truncate text-sm text-muted-foreground">{p.courier}{p.shelfId ? ` · Shelf ${p.shelfId}` : ''}</p>
                  <p className="text-xs text-muted-foreground">{age(p.ageHours)} at the gate</p>
                </div>
                <StatusChip status={toChipStatus(p.status, p.isOverdue)} label={p.isOverdue ? 'Overdue' : undefined} />
              </li>
            ))}
          </ul>
          {total > items.length && <p className="text-sm text-muted-foreground">and {total - items.length} more</p>}
        </>
      )}
    </Card>
  );
}
