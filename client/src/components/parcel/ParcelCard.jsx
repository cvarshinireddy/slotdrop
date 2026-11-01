import { Link } from 'react-router-dom';
import { CalendarClock, MapPin, QrCode } from 'lucide-react';
import { buttonStyles, Card, CardTitle, CourierBadge, StatusChip, toChipStatus } from '@/components/ui';
import { receivedLabel, slotLong } from '@/lib/format';
import { cn } from '@/lib/utils';

const COPY = {
  RECEIVED: (c) => `Your ${c} parcel is at the gate. When should we hand it over?`,
  SLOT_BOOKED: () => 'You are booked in. Show your QR or code at the gate.',
};

// Photo from the gate when we have one; otherwise the courier tile. The photo gets a small courier badge.
function Thumb({ parcel }) {
  if (!parcel.photoUrl) return <CourierBadge courier={parcel.courier} className="size-16" />;
  return (
    <span className="relative size-16 shrink-0">
      <img src={parcel.photoUrl} alt={`${parcel.courier} parcel at the gate`} className="size-16 rounded-2xl border border-border object-cover" />
      <CourierBadge courier={parcel.courier} className="absolute -bottom-1.5 -right-1.5 size-7 rounded-lg text-xs ring-2 ring-surface" />
    </span>
  );
}

export function ParcelCard({ parcel, booking, fresh = false }) {
  const status = toChipStatus(parcel.status, parcel.isOverdue);
  return (
    <Card
      as="article"
      animate
      layout
      aria-label={`${parcel.courier} parcel, ${status}`}
      className={cn('space-y-4 transition-shadow duration-base', fresh && 'ring-2 ring-primary ring-offset-2 ring-offset-background')}
    >
      <div className="flex gap-4">
        <Thumb parcel={parcel} />
        <div className="min-w-0 flex-1">
          <StatusChip status={status} label={parcel.isOverdue ? 'Waiting 2+ days' : undefined} />
          <CardTitle className="mt-1.5 truncate">{parcel.courier}</CardTitle>
          <p className="text-sm text-muted-foreground">{COPY[parcel.status]?.(parcel.courier)}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>Received {receivedLabel(parcel.receivedAt)}</span>
            {parcel.shelfId && <span className="inline-flex items-center gap-1"><MapPin className="size-3" aria-hidden />Shelf {parcel.shelfId}</span>}
          </p>
        </div>
      </div>

      {parcel.status === 'RECEIVED' && (
        <Link to={`/parcels/${parcel._id}/slot`} className={buttonStyles({ size: 'lg', block: true })}>
          <CalendarClock className="size-5" aria-hidden />Choose a slot
        </Link>
      )}
      {parcel.status === 'SLOT_BOOKED' && booking && (
        <div className="flex flex-col gap-3 rounded-2xl bg-status-booked-bg p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-status-booked-fg">{slotLong(booking.slot.startsAt, booking.slot.endsAt)}</p>
          <Link to={`/bookings/${booking.bookingId}`} className="flex min-h-tap items-center justify-center gap-2 rounded-2xl bg-surface px-4 text-sm font-semibold text-foreground shadow-soft">
            <QrCode className="size-4" aria-hidden />View pass
          </Link>
        </div>
      )}
    </Card>
  );
}
