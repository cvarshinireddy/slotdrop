import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { BellRing, CalendarPlus, Share2 } from 'lucide-react';
import {
  Button, Card, CardDescription, CardTitle, CourierBadge, EmptyState, Modal, ParcelCardSkeleton, QRCard,
  Skeleton, SlotChip, StatusChip, Stepper, useToast,
} from '@/components/ui';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { PageTransition } from '@/components/layout/PageTransition';

const SWATCHES = [
  ['background', 'bg-background'], ['surface', 'bg-surface'], ['surface-2', 'bg-surface-2'], ['border', 'bg-border'],
  ['foreground', 'bg-foreground'], ['muted-foreground', 'bg-muted-foreground'],
  ['primary', 'bg-primary'], ['primary-soft', 'bg-primary-soft'],
  ['received', 'bg-status-received'], ['booked', 'bg-status-booked'], ['delivered', 'bg-status-delivered'], ['overdue', 'bg-status-overdue'],
];

const TYPE = [
  ['text-4xl font-display font-bold', '36 / Display', 'Parcels, on your time'],
  ['text-3xl font-display font-semibold', '28 / Heading', 'Good evening, Priya'],
  ['text-xl font-display font-semibold', '20 / Title', 'Parcels waiting for you'],
  ['text-base', '16 / Body', 'Your Amazon parcel is at the gate.'],
  ['text-sm', '14 / Small', 'Received today at 4:12 PM'],
  ['text-xs', '12 / Caption', 'Shelf S-12 · Tower A'],
];

const COURIERS = ['Amazon', 'Flipkart', 'Swiggy Instamart', 'Blinkit', 'Zomato', 'Myntra', 'Delhivery', 'BlueDart', 'Other'];

const SLOTS = [
  { id: 1, label: '9 – 10 AM', remaining: 4 },
  { id: 2, label: '10 – 11 AM', remaining: 2, suggested: true },
  { id: 3, label: '11 AM – 12 PM', remaining: 0, reason: 'Fully booked' },
  { id: 4, label: '5 – 6 PM', remaining: 1 },
  { id: 5, label: '6 – 7 PM', remaining: 0, reason: 'Slot has already started' },
  { id: 6, label: '7 – 8 PM', remaining: 5 },
];

function Section({ id, title, description, children }) {
  return (
    <section aria-labelledby={id} className="space-y-4">
      <div>
        <h2 id={id} className="text-xl font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default function DesignSystem() {
  const { toast } = useToast();
  const [selected, setSelected] = useState(2);
  const [modalOpen, setModalOpen] = useState(false);
  const [qr, setQr] = useState('');

  useEffect(() => { document.title = 'Design system · SlotDrop'; }, []);
  useEffect(() => {
    QRCode.toDataURL('slotdrop-demo-token', { margin: 1, width: 448 }).then(setQr);
  }, []);

  return (
    <PageTransition>
      <main className="mx-auto max-w-5xl space-y-12 px-4 pb-32 pt-8 sm:px-6 lg:pt-12">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">SlotDrop design system</p>
            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Calm, quick, trustworthy.</h1>
            <p className="mt-2 max-w-xl text-muted-foreground">Tokens and components used across resident, guard and admin screens. Toggle the theme to check both modes.</p>
          </div>
          <ThemeToggle />
        </header>

        <Section id="colors" title="Colour tokens" description="Every colour is a CSS variable. One accent, neutral grays, four status colours.">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {SWATCHES.map(([name, cls]) => (
              <div key={name} className="space-y-1.5">
                <div className={`h-14 rounded-2xl border border-border ${cls}`} />
                <p className="text-xs font-medium">{name}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="type" title="Typography" description="Bricolage Grotesque for display, Figtree for body, JetBrains Mono for codes.">
          <Card className="space-y-4">
            {TYPE.map(([cls, label, sample]) => (
              <div key={label} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-6">
                <span className="w-28 shrink-0 text-xs text-muted-foreground">{label}</span>
                <span className={cls}>{sample}</span>
              </div>
            ))}
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-6">
              <span className="w-28 shrink-0 text-xs text-muted-foreground">Mono / OTP</span>
              <span className="font-mono text-3xl font-semibold tracking-[0.3em]">482 913</span>
            </div>
          </Card>
        </Section>

        <Section id="buttons" title="Button" description="44px minimum tap target. Large size for the main action on a screen.">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Book slot</Button>
            <Button variant="secondary">Reschedule</Button>
            <Button variant="soft">Share</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="success">Hand over</Button>
            <Button variant="danger">Cancel booking</Button>
            <Button loading>Booking</Button>
            <Button disabled>Disabled</Button>
            <Button size="icon" variant="secondary" aria-label="Notifications"><BellRing className="size-5" aria-hidden /></Button>
          </div>
          <Button size="lg" block>Choose a slot</Button>
        </Section>

        <Section id="status" title="StatusChip" description="Colour plus icon plus label, never colour alone.">
          <div className="flex flex-wrap gap-3">
            <StatusChip status="received" />
            <StatusChip status="booked" />
            <StatusChip status="delivered" />
            <StatusChip status="overdue" />
          </div>
        </Section>

        <Section id="cards" title="Card with courier badge" description="The resident's primary card: parcel, status, one big action.">
          <div className="grid gap-4 md:grid-cols-2">
            <Card animate className="space-y-4">
              <div className="flex gap-4">
                <CourierBadge courier="Amazon" />
                <div className="min-w-0 flex-1">
                  <StatusChip status="received" />
                  <CardTitle className="mt-1.5">Amazon</CardTitle>
                  <CardDescription>Your Amazon parcel is at the gate. When should we hand it over?</CardDescription>
                  <p className="mt-1 text-xs text-muted-foreground">Received today, 4:12 PM · Shelf S-12</p>
                </div>
              </div>
              <Button size="lg" block>Choose a slot</Button>
            </Card>
            <Card animate className="space-y-4">
              <div className="flex gap-4">
                <CourierBadge courier="Swiggy Instamart" />
                <div className="min-w-0 flex-1">
                  <StatusChip status="overdue" label="Waiting 3 days" />
                  <CardTitle className="mt-1.5">Swiggy Instamart</CardTitle>
                  <CardDescription>This has been at the gate a while. Pick a time that works.</CardDescription>
                </div>
              </div>
              <Button size="lg" block variant="soft">Choose a slot</Button>
            </Card>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Courier badges">
            {COURIERS.map((c) => <CourierBadge key={c} courier={c} className="size-11 rounded-xl text-sm" />)}
          </div>
        </Section>

        <Section id="slots" title="SlotChip" description="Selected, suggested, available, and unavailable with a reason.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {SLOTS.map((s) => (
              <SlotChip key={s.id} {...s} selected={selected === s.id} onSelect={() => setSelected(s.id)} />
            ))}
          </div>
        </Section>

        <Section id="stepper" title="Stepper" description="Parcel history timeline.">
          <Card className="max-w-sm">
            <Stepper
              steps={[
                { key: 'r', label: 'Received at gate', detail: 'Mon, 4:12 PM · Ramesh Kumar', state: 'done' },
                { key: 'b', label: 'Slot booked', detail: 'Tue, 6 – 7 PM', state: 'done' },
                { key: 'd', label: 'Handed over', detail: 'Waiting for pickup', state: 'current' },
                { key: 'c', label: 'Completed', state: 'todo' },
              ]}
            />
          </Card>
        </Section>

        <Section id="qr" title="QRCard" description="Large QR with 6-digit OTP fallback. Stays dark-on-light in dark mode so it scans.">
          <div className="max-w-xs">
            {qr ? <QRCard qrSrc={qr} otp="482913" caption="Valid until 8:00 PM today" /> : <Skeleton className="h-96" />}
          </div>
        </Section>

        <Section id="empty" title="EmptyState" description="Illustrated, friendly, always with a next step.">
          <div className="grid gap-4 md:grid-cols-2">
            <Card><EmptyState illustration="noParcels" title="Nothing waiting at the gate" description="We will ping you the moment a parcel arrives." /></Card>
            <Card><EmptyState illustration="error" title="Could not load your parcels" description="Check your connection and try again." action={<Button variant="secondary">Try again</Button>} /></Card>
            <Card><EmptyState illustration="noHistory" title="No past parcels yet" description="Delivered parcels will show up here." /></Card>
            <Card><EmptyState illustration="noNotifications" title="You are all caught up" description="New updates will appear here." /></Card>
          </div>
        </Section>

        <Section id="feedback" title="Toast and Modal" description="Toasts auto-dismiss and announce politely; errors announce assertively.">
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => toast({ variant: 'success', title: 'Slot booked', description: 'Tue, 6 – 7 PM. Your OTP is ready.' })}>Success toast</Button>
            <Button variant="secondary" onClick={() => toast({ variant: 'error', title: 'That slot just filled up', description: 'Please pick another time.' })}>Error toast</Button>
            <Button variant="secondary" onClick={() => toast({ variant: 'info', title: 'New parcel at the gate', description: 'Flipkart, shelf S-04.' })}>Info toast</Button>
            <Button onClick={() => setModalOpen(true)} leftIcon={Share2}>Open modal</Button>
          </div>
          <Modal open={modalOpen} onOpenChange={setModalOpen} title="Share with a neighbour" description="They get a temporary code that works once, for this parcel only.">
            <div className="space-y-4">
              <label className="block text-sm font-medium" htmlFor="ds-name">Who is collecting?</label>
              <input id="ds-name" className="min-h-tap w-full rounded-2xl border border-border bg-background px-4 text-base" placeholder="e.g. Meera Iyer, B-904" />
              <Button block size="lg" leftIcon={CalendarPlus} onClick={() => { setModalOpen(false); toast({ variant: 'success', title: 'Code created' }); }}>Create code</Button>
            </div>
          </Modal>
        </Section>

        <Section id="skeleton" title="Skeleton" description="Same shape as the real card, so nothing jumps on load.">
          <div className="grid gap-4 md:grid-cols-2"><ParcelCardSkeleton /><ParcelCardSkeleton /></div>
        </Section>
      </main>
    </PageTransition>
  );
}
