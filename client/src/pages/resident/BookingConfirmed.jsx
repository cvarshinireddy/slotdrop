import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarPlus, Clock, Share2, XCircle } from 'lucide-react';
import { Button, Card, EmptyState, Modal, QRCard, Skeleton, useToast } from '@/components/ui';
import { DelegateModal } from '@/components/parcel/DelegateModal';
import { useParcels } from '@/context/ParcelsContext';
import { api } from '@/lib/api';
import { countdown, slotLong, timeOnly } from '@/lib/format';
import { downloadIcs } from '@/lib/ics';

// Animated tick: the path "draws" itself (pathLength 0 -> 1). Reduced-motion users just see it.
function SuccessCheck() {
  return (
    <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
      className="mx-auto flex size-16 items-center justify-center rounded-full bg-status-delivered-bg text-status-delivered">
      <svg viewBox="0 0 24 24" className="size-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.03, duration: 0.22 }} />
      </svg>
    </motion.span>
  );
}

function useNow(everyMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), everyMs); return () => clearInterval(t); }, [everyMs]);
  return now;
}

export default function BookingConfirmed() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refresh } = useParcels();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const now = useNow();

  const load = useCallback(() => { setError(false); api.getBooking(id).then(setBooking).catch(() => setError(true)); }, [id]);
  useEffect(load, [load]);

  async function cancel() {
    setCancelling(true);
    try {
      await api.cancelBooking(booking._id);
      await refresh({ silent: true });
      toast({ variant: 'info', title: 'Booking cancelled', description: 'Pick a new time whenever you are ready.' });
      navigate(`/parcels/${booking.parcelId._id}/slot`, { replace: true });
    } catch (e) { toast({ variant: 'error', title: 'Could not cancel', description: e.message }); setCancelling(false); setCancelOpen(false); }
  }

  if (error) return <EmptyState illustration="error" title="Could not load your pass" description="Check your connection and try again." action={<Button variant="secondary" onClick={load}>Try again</Button>} />;
  if (!booking) return <div className="space-y-4" role="status" aria-label="Loading your pass"><Skeleton className="mx-auto size-16 rounded-full" /><Skeleton className="h-8" /><Skeleton className="h-96" /></div>;

  const { slotId: slot, parcelId: parcel } = booking;
  const active = booking.status === 'ACTIVE';
  const msToStart = new Date(slot.startsAt) - now;
  const live = active && msToStart <= 0 && new Date(slot.endsAt) > now;

  if (!active) {
    return (
      <div className="space-y-4 text-center">
        <SuccessCheck />
        <h1 className="text-3xl font-bold">{booking.status === 'COMPLETED' ? 'Parcel collected' : 'Booking cancelled'}</h1>
        <p className="text-muted-foreground">{booking.status === 'COMPLETED' ? `Your ${parcel.courier} parcel was handed over.` : 'This booking is no longer active.'}</p>
        <Link to="/" className="inline-flex min-h-tap items-center font-semibold text-primary underline">Back to home</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header className="space-y-3 text-center">
        <SuccessCheck />
        <h1 className="text-3xl font-bold">You are all set</h1>
        <p className="text-muted-foreground">{parcel.courier} · {slotLong(slot.startsAt, slot.endsAt)}</p>
        <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-status-booked-bg px-4 py-2 text-sm font-semibold text-status-booked-fg" role="timer" aria-live="off">
          <Clock className="size-4" aria-hidden />{live ? 'Your slot is on. Head to the gate.' : `Starts in ${countdown(msToStart)}`}
        </p>
      </header>

      <QRCard qrSrc={booking.qrDataUrl} otp={booking.otp} caption={`Valid until ${timeOnly(booking.otpExpiresAt)}. Works once.`} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Button size="lg" variant="soft" leftIcon={Share2} onClick={() => setShareOpen(true)}>Share with neighbour</Button>
        <Button size="lg" variant="secondary" leftIcon={CalendarPlus} onClick={() => downloadIcs({ id: booking._id, startsAt: slot.startsAt, endsAt: slot.endsAt, courier: parcel.courier })}>Add to calendar</Button>
      </div>

      {booking.delegations?.length > 0 && (
        <Card className="space-y-2" as="section" aria-labelledby="shared-h">
          <h2 id="shared-h" className="text-base font-semibold">Shared pickup codes</h2>
          <ul className="space-y-2">
            {booking.delegations.map((d) => (
              <li key={d._id} className="flex items-center justify-between gap-3 text-sm"><span>{d.delegateName}</span><span className="font-mono font-semibold tracking-widest">{d.code}</span></li>
            ))}
          </ul>
        </Card>
      )}

      <Button variant="ghost" block leftIcon={XCircle} onClick={() => setCancelOpen(true)} className="text-status-overdue-fg">Reschedule or cancel</Button>
      <DelegateModal open={shareOpen} onOpenChange={setShareOpen} booking={booking} onCreated={load} />
      <Modal open={cancelOpen} onOpenChange={setCancelOpen} title="Cancel this slot?" description="Your parcel stays at the gate. You can pick a new time right after.">
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" onClick={() => setCancelOpen(false)}>Keep my slot</Button>
          <Button variant="danger" loading={cancelling} onClick={cancel}>Cancel slot</Button>
        </div>
      </Modal>
    </div>
  );
}
