import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CalendarX2 } from 'lucide-react';
import { Button, CourierBadge, EmptyState, Skeleton, SlotChip, useToast } from '@/components/ui';
import { useParcels } from '@/context/ParcelsContext';
import { api } from '@/lib/api';
import { addDaysKey, dateKey, dayLabel, dayNumber, slotLong, slotRange, weekday } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function SlotPicker() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { parcels, status, patchParcel, refresh } = useParcels();
  const parcel = parcels.find((p) => p._id === id);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysKey(dateKey(), i)), []);
  const [day, setDay] = useState(days[0]);
  const [slotsByDay, setSlotsByDay] = useState({}); // dayKey -> slots | 'error'
  const [selected, setSelected] = useState(null); // { slot, day }
  const [booking, setBooking] = useState(false);

  const loadDay = useCallback(async (key) => {
    try { const slots = await api.listSlots(key); setSlotsByDay((m) => ({ ...m, [key]: slots })); }
    catch { setSlotsByDay((m) => ({ ...m, [key]: 'error' })); }
  }, []);
  useEffect(() => { if (!slotsByDay[day]) loadDay(day); }, [day, slotsByDay, loadDay]);

  const slots = slotsByDay[day];
  const adjust = (slotId, delta) => setSlotsByDay((m) => ({ ...m, [day]: m[day].map((s) => (s._id === slotId ? { ...s, remaining: Math.max(0, s.remaining + delta), reason: s.remaining + delta <= 0 ? 'Fully booked' : s.reason } : s)) }));

  // OPTIMISTIC booking: the UI reflects success instantly (parcel flips to "booked", seat count drops) and is
  // rolled back with a clear message if the server says no, e.g. someone took the last seat a moment earlier.
  async function confirm() {
    const { slot } = selected;
    setBooking(true);
    patchParcel(parcel._id, { status: 'SLOT_BOOKED' });
    adjust(slot._id, -1);
    try {
      const { booking: b } = await api.createBooking(parcel._id, slot._id);
      await refresh({ silent: true });
      toast({ variant: 'success', title: 'Slot booked', description: slotLong(slot.startsAt, slot.endsAt) });
      navigate(`/bookings/${b._id}`, { replace: true });
    } catch (e) {
      patchParcel(parcel._id, { status: 'RECEIVED' });
      adjust(slot._id, +1);
      setSelected(null); setBooking(false);
      toast({ variant: 'error', title: e.code === 'SLOT_FULL' ? 'That slot just filled up' : 'Could not book that slot', description: e.code === 'SLOT_FULL' ? 'Please pick another time.' : e.message });
      loadDay(day); // refresh real availability
    }
  }

  if (status === 'loading') return <Skeleton className="h-64" />;
  if (!parcel || parcel.status !== 'RECEIVED') {
    return <EmptyState illustration="noHistory" title="This parcel does not need a slot" description="It may already be booked or collected." action={<Link to="/" className="text-sm font-semibold text-primary underline">Back to home</Link>} />;
  }

  return (
    <div className="space-y-6 pb-28">
      <div>
        <Link to="/" className="-ml-2 inline-flex min-h-tap items-center gap-1 rounded-xl px-2 text-sm font-medium text-muted-foreground hover:bg-surface-2"><ArrowLeft className="size-4" aria-hidden />Back</Link>
        <div className="mt-2 flex items-center gap-3">
          <CourierBadge courier={parcel.courier} className="size-12 rounded-xl text-base" />
          <div><h1 className="text-3xl font-bold">Pick a time</h1><p className="text-muted-foreground">for your {parcel.courier} parcel</p></div>
        </div>
      </div>

      <div role="group" aria-label="Choose a day" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {days.map((key) => (
          <button key={key} onClick={() => { setDay(key); setSelected(null); }} aria-pressed={day === key} aria-label={dayLabel(key)}
            className={cn('flex min-h-16 min-w-16 shrink-0 flex-col items-center justify-center rounded-2xl border px-3 transition-colors duration-fast', day === key ? 'border-primary bg-primary text-primary-foreground shadow-soft' : 'border-border bg-surface hover:bg-surface-2')}>
            <span className="text-xs font-medium opacity-80">{key === days[0] ? 'Today' : weekday(key)}</span>
            <span className="font-display text-xl font-semibold">{dayNumber(key)}</span>
          </button>
        ))}
      </div>

      <section aria-labelledby="slots-h">
        <h2 id="slots-h" className="sr-only">Available time slots for {dayLabel(day)}</h2>
        {!slots && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" role="status" aria-label="Loading slots">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>}
        {slots === 'error' && <EmptyState illustration="error" title="Could not load slots" action={<Button variant="secondary" onClick={() => { setSlotsByDay((m) => ({ ...m, [day]: undefined })); }}>Try again</Button>} />}
        {Array.isArray(slots) && slots.length === 0 && <EmptyState illustration="noHistory" title="No slots on this day" description="The society office has not opened slots yet." />}
        {Array.isArray(slots) && slots.length > 0 && slots.every((s) => s.reason) && (
          <p className="mb-3 flex items-center gap-2 rounded-2xl bg-surface-2 p-3 text-sm text-muted-foreground"><CalendarX2 className="size-4" aria-hidden />Nothing open on this day. Try another.</p>
        )}
        {Array.isArray(slots) && slots.some((s) => s.suggested) && (
          <p className="mb-3 text-sm text-muted-foreground">
            {slots.find((s) => s.suggested).suggestedReason === 'history' ? 'Suggested based on when you usually collect.' : 'Suggested because it is the quietest time, so there is no queue at the gate.'}
          </p>
        )}
        {Array.isArray(slots) && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
            {slots.map((s) => (
              <SlotChip key={s._id} label={slotRange(s.startsAt, s.endsAt)} remaining={s.remaining} reason={s.reason} suggested={s.suggested}
                selected={selected?.slot._id === s._id} onSelect={() => setSelected({ slot: s, day })} />
            ))}
          </div>
        )}
      </section>

      {/* Sticky confirm bar sits above the mobile tab bar (4rem) and beside the sidebar on desktop */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ duration: 0.2 }}
            className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 lg:max-w-4xl">
              <div className="min-w-0"><p className="text-xs text-muted-foreground">Your handover slot</p><p className="truncate font-semibold" aria-live="polite">{slotLong(selected.slot.startsAt, selected.slot.endsAt)}</p></div>
              <Button size="lg" onClick={confirm} loading={booking}>Confirm slot</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
