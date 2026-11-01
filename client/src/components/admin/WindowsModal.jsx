import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Modal, useToast } from '@/components/ui';
import { api } from '@/lib/api';

const field = 'min-h-tap rounded-xl border border-border bg-background px-3 text-sm';

// Client-side mirror of the server rules (end > start, no overlaps, 1-100 capacity) so errors show before saving.
function problem(rows) {
  if (rows.length === 0) return 'Add at least one time window.';
  for (const r of rows) {
    if (!r.startTime || !r.endTime) return 'Fill in every start and end time.';
    if (r.endTime <= r.startTime) return 'Each window must end after it starts.';
    if (!(r.capacity >= 1 && r.capacity <= 100)) return 'Capacity must be between 1 and 100.';
  }
  const sorted = [...rows].sort((a, b) => a.startTime.localeCompare(b.startTime));
  return sorted.some((r, i) => i && sorted[i - 1].endTime > r.startTime) ? 'Time windows must not overlap.' : '';
}

export function WindowsModal({ open, onOpenChange, onSaved }) {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => { if (open) { setServerError(''); api.listTemplates().then(setRows).catch(() => setServerError('Could not load the current windows.')); } }, [open]);
  const set = (i, patch) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const issue = problem(rows);

  async function save() {
    setBusy(true); setServerError('');
    try {
      await api.putTemplates(rows.map(({ startTime, endTime, capacity }) => ({ startTime, endTime, capacity: Number(capacity) })));
      toast({ variant: 'success', title: 'Time windows saved', description: 'The next 7 days now follow the new plan. Booked slots are untouched.' });
      onSaved?.(); onOpenChange(false);
    } catch (e) { setServerError(e.message); } finally { setBusy(false); }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Daily time windows" description="These repeat every day. Slots with bookings are never removed.">
      <div className="space-y-3">
        <ul className="max-h-[45dvh] space-y-2 overflow-y-auto pr-1">
          {rows.map((r, i) => (
            <li key={i} className="grid grid-cols-[1fr_1fr_4.5rem_auto] items-center gap-2">
              <input aria-label={`Window ${i + 1} start`} type="time" value={r.startTime} onChange={(e) => set(i, { startTime: e.target.value })} className={field} />
              <input aria-label={`Window ${i + 1} end`} type="time" value={r.endTime} onChange={(e) => set(i, { endTime: e.target.value })} className={field} />
              <input aria-label={`Window ${i + 1} capacity`} type="number" min={1} max={100} inputMode="numeric" value={r.capacity} onChange={(e) => set(i, { capacity: e.target.value === '' ? '' : Number(e.target.value) })} className={`${field} text-center`} />
              <button type="button" aria-label={`Remove window ${i + 1}`} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="flex min-h-tap min-w-tap items-center justify-center rounded-xl text-muted-foreground hover:bg-surface-2"><Trash2 className="size-4" aria-hidden /></button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">Start, end, parcels per window.</p>
        <Button variant="secondary" leftIcon={Plus} onClick={() => setRows((rs) => [...rs, { startTime: '', endTime: '', capacity: 4 }])}>Add window</Button>
        {(issue || serverError) && <p role="alert" className="rounded-2xl bg-status-overdue-bg p-3 text-sm text-status-overdue-fg">{serverError || issue}</p>}
        <Button size="lg" block onClick={save} loading={busy} disabled={Boolean(issue)}>Save windows</Button>
      </div>
    </Modal>
  );
}
