import { AlertTriangle, CalendarCheck, CheckCircle2, PackageOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

// Colour is never the only signal: every status also has its own icon and a text label (WCAG 1.4.1).
export const STATUS = {
  received: { label: 'At the gate', icon: PackageOpen, cls: 'bg-status-received-bg text-status-received-fg border-status-received-border' },
  booked: { label: 'Slot booked', icon: CalendarCheck, cls: 'bg-status-booked-bg text-status-booked-fg border-status-booked-border' },
  delivered: { label: 'Delivered', icon: CheckCircle2, cls: 'bg-status-delivered-bg text-status-delivered-fg border-status-delivered-border' },
  overdue: { label: 'Overdue', icon: AlertTriangle, cls: 'bg-status-overdue-bg text-status-overdue-fg border-status-overdue-border' },
};

// Maps API values (RECEIVED / SLOT_BOOKED / DELIVERED + derived isOverdue) to a chip status.
export const toChipStatus = (apiStatus, isOverdue) =>
  isOverdue ? 'overdue' : { RECEIVED: 'received', SLOT_BOOKED: 'booked', DELIVERED: 'delivered' }[apiStatus];

export function StatusChip({ status, label, className }) {
  const s = STATUS[status];
  const Icon = s.icon;
  return (
    <span className={cn('inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-semibold', s.cls, className)}>
      <Icon className="size-3.5" aria-hidden />
      {label || s.label}
    </span>
  );
}
