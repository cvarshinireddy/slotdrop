import { useEffect, useState } from 'react';
import { Button, Modal, useToast } from '@/components/ui';
import { api } from '@/lib/api';

const field = 'min-h-tap w-full rounded-2xl border border-border bg-background px-4 text-base placeholder:text-muted-foreground';

export function AddFlatModal({ open, onOpenChange, onCreated }) {
  const { toast } = useToast();
  const [number, setNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setNumber(''); setFloor(''); setError(''); } }, [open]);
  const valid = /^[A-Za-z]-\d{3,4}$/.test(number);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api.createFlat({ tower: number[0].toUpperCase(), number: number.toUpperCase(), ...(floor !== '' ? { floor: Number(floor) } : {}) });
      toast({ variant: 'success', title: `Flat ${number.toUpperCase()} added` });
      onCreated?.(); onOpenChange(false);
    } catch (err) { setError(err.details?.[0]?.message || err.message); } finally { setBusy(false); }
  }
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Add a flat" description="The tower is taken from the first letter.">
      <form onSubmit={submit} className="space-y-4">
        <div><label htmlFor="af-no" className="mb-1.5 block text-sm font-medium">Flat number</label>
          <input id="af-no" className={field} value={number} onChange={(e) => setNumber(e.target.value.toUpperCase())} placeholder="A-1204" autoComplete="off" autoCapitalize="characters" required /></div>
        <div><label htmlFor="af-floor" className="mb-1.5 block text-sm font-medium">Floor <span className="font-normal text-muted-foreground">(optional)</span></label>
          <input id="af-floor" className={field} type="number" min={0} max={80} inputMode="numeric" value={floor} onChange={(e) => setFloor(e.target.value)} /></div>
        {error && <p role="alert" className="rounded-2xl bg-status-overdue-bg p-3 text-sm text-status-overdue-fg">{error}</p>}
        <Button type="submit" size="lg" block loading={busy} disabled={!valid}>Add flat</Button>
      </form>
    </Modal>
  );
}
