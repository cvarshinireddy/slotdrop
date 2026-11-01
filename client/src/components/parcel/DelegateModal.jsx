import { useState } from 'react';
import { Check, Copy, MessageCircle, Share2 } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { api } from '@/lib/api';
import { slotLong } from '@/lib/format';

const inputCls = 'min-h-tap w-full rounded-2xl border border-border bg-background px-4 text-base placeholder:text-muted-foreground';

// Creates a temporary pickup code for a neighbour/family member. The code is single-use and expires with the slot.
export function DelegateModal({ open, onOpenChange, booking, onCreated }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const reset = () => { setName(''); setPhone(''); setError(''); setResult(null); setCopied(false); };
  const close = (o) => { onOpenChange(o); if (!o) setTimeout(reset, 250); };
  const message = result && `Hi ${result.name}, please collect my ${booking.parcelId.courier} parcel from the gate on ${slotLong(booking.slotId.startsAt, booking.slotId.endsAt)}. Tell the guard flat ${booking.parcelId.flatId.number} and code ${result.code}. (SlotDrop)`;

  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const body = { delegateName: name.trim(), ...(phone ? { delegatePhone: phone } : {}) };
      const d = await api.delegate(booking._id, body);
      setResult({ code: d.code, name: name.trim() });
      onCreated?.();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function copy() { try { await navigator.clipboard.writeText(result.code); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* code stays visible */ } }
  const share = () => (navigator.share ? navigator.share({ text: message }).catch(() => {}) : window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener'));

  return (
    <Modal open={open} onOpenChange={close} title="Share with a neighbour" description="They get a temporary code that works once, for this parcel only.">
      {!result ? (
        <form onSubmit={submit} className="space-y-4">
          <div><label htmlFor="dg-name" className="mb-1.5 block text-sm font-medium">Who is collecting?</label>
            <input id="dg-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Meera Iyer, B-904" minLength={2} maxLength={80} required autoComplete="off" /></div>
          <div><label htmlFor="dg-phone" className="mb-1.5 block text-sm font-medium">Mobile <span className="font-normal text-muted-foreground">(optional)</span></label>
            <input id="dg-phone" className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder="10-digit number" pattern="[6-9][0-9]{9}|" /></div>
          {error && <p role="alert" className="rounded-2xl bg-status-overdue-bg p-3 text-sm text-status-overdue-fg">{error}</p>}
          <Button type="submit" size="lg" block loading={busy} disabled={name.trim().length < 2}>Create code</Button>
        </form>
      ) : (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">Share this with {result.name}. It works once.</p>
          <p className="font-mono text-4xl font-semibold tracking-[0.3em]" aria-label={`Pickup code ${result.code.split('').join(' ')}`}>{result.code}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button onClick={share} leftIcon={navigator.share ? Share2 : MessageCircle} variant="success">{navigator.share ? 'Share' : 'WhatsApp'}</Button>
            <Button variant="secondary" onClick={copy} leftIcon={copied ? Check : Copy} aria-live="polite">{copied ? 'Copied' : 'Copy code'}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
