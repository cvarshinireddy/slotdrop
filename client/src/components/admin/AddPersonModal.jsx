import { useEffect, useState } from 'react';
import { Check, Copy, Dices } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { api } from '@/lib/api';

const field = 'min-h-tap w-full rounded-2xl border border-border bg-background px-4 text-base placeholder:text-muted-foreground';
const lbl = 'mb-1.5 block text-sm font-medium';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

// crypto.getRandomValues, not Math.random: this becomes a real login password.
function tempPassword() {
  const buf = crypto.getRandomValues(new Uint32Array(10));
  return `${Array.from(buf, (n) => ALPHABET[n % ALPHABET.length]).join('')}9`;
}
const EMPTY = { name: '', email: '', phone: '', role: 'resident', flatId: '', password: '' };

export function AddPersonModal({ open, onOpenChange, flats, onCreated }) {
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));

  useEffect(() => { if (open) { setF({ ...EMPTY, password: tempPassword() }); setError(''); setCreated(null); setCopied(false); } }, [open]);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const body = { name: f.name.trim(), email: f.email.trim(), phone: f.phone, password: f.password, role: f.role, ...(f.role === 'resident' ? { flatId: f.flatId } : {}) };
      const user = await api.registerUser(body);
      setCreated({ user, password: f.password });
      onCreated?.();
    } catch (err) { setError(err.details?.[0]?.message || err.message); } finally { setBusy(false); }
  }
  const text = created && `SlotDrop login for ${created.user.name}\nEmail: ${created.user.email}\nPassword: ${created.password}`;
  async function copy() { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* visible on screen */ } }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={created ? 'Account created' : 'Add a person'} description={created ? 'Share these login details securely. The password is not shown again.' : 'Residents, guards and admins are added by the society office.'}>
      {created ? (
        <div className="space-y-4">
          <dl className="space-y-2 rounded-2xl bg-surface-2 p-4 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Name</dt><dd className="font-medium">{created.user.name}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Email</dt><dd className="break-all font-medium">{created.user.email}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Password</dt><dd className="font-mono font-semibold">{created.password}</dd></div>
          </dl>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="secondary" leftIcon={copied ? Check : Copy} onClick={copy} aria-live="polite">{copied ? 'Copied' : 'Copy details'}</Button>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div role="group" aria-label="Role" className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1">
            {[['resident', 'Resident'], ['guard', 'Guard'], ['admin', 'Admin']].map(([v, t]) => (
              <button key={v} type="button" aria-pressed={f.role === v} onClick={() => set({ role: v })} className={`min-h-tap rounded-xl text-sm font-semibold ${f.role === v ? 'bg-surface shadow-soft' : 'text-muted-foreground'}`}>{t}</button>
            ))}
          </div>
          <div><label htmlFor="ap-name" className={lbl}>Full name</label><input id="ap-name" className={field} value={f.name} onChange={(e) => set({ name: e.target.value })} minLength={2} maxLength={80} required autoComplete="off" /></div>
          <div><label htmlFor="ap-email" className={lbl}>Email</label><input id="ap-email" type="email" className={field} value={f.email} onChange={(e) => set({ email: e.target.value })} required autoComplete="off" /></div>
          <div><label htmlFor="ap-phone" className={lbl}>Mobile</label><input id="ap-phone" className={field} inputMode="numeric" placeholder="10-digit number" value={f.phone} onChange={(e) => set({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} pattern="[6-9][0-9]{9}" title="10-digit Indian mobile number" required autoComplete="off" /></div>
          {f.role === 'resident' && (
            <div><label htmlFor="ap-flat" className={lbl}>Flat</label>
              <select id="ap-flat" className={field} value={f.flatId} onChange={(e) => set({ flatId: e.target.value })} required>
                <option value="" disabled>Select a flat</option>
                {flats.map((fl) => <option key={fl._id} value={fl._id}>{fl.number}</option>)}
              </select></div>
          )}
          <div><label htmlFor="ap-pw" className={lbl}>Temporary password</label>
            <div className="flex gap-2"><input id="ap-pw" className={`${field} font-mono`} value={f.password} onChange={(e) => set({ password: e.target.value })} minLength={8} required autoComplete="off" />
              <Button type="button" variant="secondary" size="icon" aria-label="Generate a new password" onClick={() => set({ password: tempPassword() })}><Dices className="size-5" aria-hidden /></Button></div></div>
          {error && <p role="alert" className="rounded-2xl bg-status-overdue-bg p-3 text-sm text-status-overdue-fg">{error}</p>}
          <Button type="submit" size="lg" block loading={busy}>Create account</Button>
        </form>
      )}
    </Modal>
  );
}
