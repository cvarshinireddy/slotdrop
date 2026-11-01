import { Bell, CalendarCheck, CheckCircle2, Clock, PackageOpen } from 'lucide-react';
import { EmptyState, Modal, Skeleton, Button } from '@/components/ui';
import { useNotifications } from '@/context/NotificationsContext';
import { cn } from '@/lib/utils';
import { receivedLabel } from '@/lib/format';

const ICONS = { parcel_received: PackageOpen, slot_booked: CalendarCheck, reminder: Clock, delivered: CheckCircle2 };

export function BellButton({ className }) {
  const { unread, setOpen } = useNotifications();
  return (
    <button
      onClick={() => setOpen(true)}
      aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
      className={cn('relative flex min-h-tap min-w-tap items-center justify-center rounded-2xl text-foreground hover:bg-surface-2', className)}
    >
      <Bell className="size-5" aria-hidden />
      {unread > 0 && (
        <span aria-hidden className="absolute right-1.5 top-1.5 flex min-w-[18px] items-center justify-center rounded-full bg-status-overdue-fg px-1 text-[11px] font-bold leading-[18px] text-status-overdue-bg">{unread > 9 ? '9+' : unread}</span>
      )}
    </button>
  );
}

export function NotificationsPanel() {
  const { items, status, unread, open, setOpen, markAllRead, reload } = useNotifications();
  return (
    <Modal open={open} onOpenChange={setOpen} title="Notifications" description={unread ? `${unread} new` : 'You are all caught up'}>
      {status === 'loading' && <div className="space-y-3" role="status" aria-label="Loading notifications">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>}
      {status === 'error' && <EmptyState illustration="error" title="Could not load notifications" action={<Button variant="secondary" onClick={reload}>Try again</Button>} />}
      {status === 'ready' && items.length === 0 && <EmptyState illustration="noNotifications" title="You are all caught up" description="New updates will appear here." />}
      {status === 'ready' && items.length > 0 && (
        <>
          {unread > 0 && <Button variant="ghost" className="mb-2 -ml-2" onClick={markAllRead}>Mark all as read</Button>}
          <ul className="-mx-2 max-h-[50dvh] space-y-1 overflow-y-auto px-2">
            {items.map((n) => {
              const Icon = ICONS[n.type] || Bell;
              return (
                <li key={n._id} className={cn('flex gap-3 rounded-2xl p-3', !n.readAt && 'bg-primary-soft')}>
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface text-primary"><Icon className="size-5" aria-hidden /></span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{n.title}{!n.readAt && <span className="sr-only"> (new)</span>}</p>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{receivedLabel(n.createdAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Modal>
  );
}
