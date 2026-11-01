import { AnimatePresence } from 'framer-motion';
import { BellRing, CalendarCheck, PackageOpen } from 'lucide-react';
import { Button, Card, EmptyState, ParcelCardSkeleton } from '@/components/ui';
import { ParcelCard } from '@/components/parcel/ParcelCard';
import { useAuth } from '@/context/AuthContext';
import { useParcels } from '@/context/ParcelsContext';
import { greeting } from '@/lib/format';

const STEPS = [
  { icon: BellRing, title: 'We tell you', text: 'The guard logs your parcel and you get a notification.' },
  { icon: CalendarCheck, title: 'You pick a time', text: 'Choose a one-hour slot that suits you.' },
  { icon: PackageOpen, title: 'Show your QR', text: 'Scan or share the code at the gate. That is it.' },
];

export default function Home() {
  const { user } = useAuth();
  const { parcels, status, freshIds, slotByParcel, refresh } = useParcels();
  const waiting = parcels.filter((p) => p.status !== 'DELIVERED');
  const toBook = waiting.filter((p) => p.status === 'RECEIVED').length;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-balance">{greeting(user.name)}</h1>
        <p className="mt-1 text-muted-foreground" aria-live="polite">
          {status !== 'ready' ? 'Checking the gate…' : waiting.length === 0 ? 'Nothing is waiting for you right now.' : toBook ? `${toBook} ${toBook === 1 ? 'parcel needs' : 'parcels need'} a time from you.` : 'All your parcels have a slot. Nice.'}
        </p>
      </header>

      <section aria-labelledby="waiting-h" className="space-y-4">
        <h2 id="waiting-h" className="text-xl font-semibold">Parcels waiting for you</h2>

        {status === 'loading' && <div className="space-y-4"><ParcelCardSkeleton /><ParcelCardSkeleton /></div>}
        {status === 'error' && (
          <Card><EmptyState illustration="error" title="Could not reach the gate" description="Check your connection and try again." action={<Button variant="secondary" onClick={() => refresh()}>Try again</Button>} /></Card>
        )}
        {status === 'ready' && waiting.length === 0 && (
          <>
            <Card><EmptyState illustration="noParcels" title="Nothing waiting at the gate" description="We will ping you the moment a parcel arrives." /></Card>
            <Card as="section" aria-labelledby="how-h" className="space-y-4">
              <h3 id="how-h" className="text-xl font-semibold">How SlotDrop works</h3>
              <ol className="grid gap-4 sm:grid-cols-3">
                {STEPS.map(({ icon: Icon, title, text }, i) => (
                  <li key={title} className="flex gap-3 sm:flex-col">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground"><Icon className="size-5" aria-hidden /></span>
                    <div><p className="text-sm font-semibold">{i + 1}. {title}</p><p className="text-sm text-muted-foreground">{text}</p></div>
                  </li>
                ))}
              </ol>
            </Card>
          </>
        )}
        {status === 'ready' && waiting.length > 0 && (
          <ul className="space-y-4">
            <AnimatePresence initial={false}>
              {waiting.map((p) => (
                <li key={p._id}><ParcelCard parcel={p} booking={slotByParcel[p._id]} fresh={freshIds.has(p._id)} /></li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>
    </div>
  );
}
