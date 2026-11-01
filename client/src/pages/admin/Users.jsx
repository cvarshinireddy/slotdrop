import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Plus, UserPlus } from 'lucide-react';
import { Button, Card, EmptyState, Skeleton, Switch, useToast } from '@/components/ui';
import { AddPersonModal } from '@/components/admin/AddPersonModal';
import { AddFlatModal } from '@/components/admin/AddFlatModal';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const ROLE_FILTERS = [['all', 'Everyone'], ['resident', 'Residents'], ['guard', 'Guards'], ['admin', 'Admins']];
const initials = (name) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export default function Users() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState('people');
  const [role, setRole] = useState('all');
  const [users, setUsers] = useState(null);
  const [flats, setFlats] = useState(null);
  const [error, setError] = useState(false);
  const [personOpen, setPersonOpen] = useState(false);
  const [flatOpen, setFlatOpen] = useState(false);

  const load = useCallback(() => {
    setError(false);
    Promise.all([api.listUsers(), api.listFlats()]).then(([u, f]) => { setUsers(u); setFlats(f); }).catch(() => setError(true));
  }, []);
  useEffect(load, [load]);

  const shown = useMemo(() => (users || []).filter((u) => role === 'all' || u.role === role), [users, role]);
  const residentsByFlat = useMemo(() => {
    const m = {};
    (users || []).filter((u) => u.role === 'resident' && u.flatId).forEach((u) => { (m[u.flatId._id || u.flatId] ||= []).push(u); });
    return m;
  }, [users]);

  // Optimistic toggle with rollback; the server also refuses to deactivate yourself.
  async function toggle(u, next) {
    setUsers((list) => list.map((x) => (x._id === u._id ? { ...x, isActive: next } : x)));
    try { await api.setUserActive(u._id, next); toast({ variant: 'success', title: `${u.name} ${next ? 'reactivated' : 'deactivated'}`, description: next ? undefined : 'They are signed out and cannot log in.' }); }
    catch (e) { setUsers((list) => list.map((x) => (x._id === u._id ? { ...x, isActive: !next } : x))); toast({ variant: 'error', title: 'Could not update', description: e.message }); }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div><h1 className="text-3xl font-bold">People and flats</h1><p className="mt-1 text-muted-foreground">Who can use SlotDrop in your society.</p></div>
        {tab === 'people'
          ? <Button leftIcon={UserPlus} onClick={() => setPersonOpen(true)}>Add person</Button>
          : <Button leftIcon={Plus} onClick={() => setFlatOpen(true)}>Add flat</Button>}
      </header>

      <div role="tablist" aria-label="Section" className="grid max-w-xs grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
        {[['people', 'People'], ['flats', 'Flats']].map(([id, t]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cn('min-h-tap rounded-xl text-sm font-semibold', tab === id ? 'bg-surface shadow-soft' : 'text-muted-foreground')}>{t}</button>
        ))}
      </div>

      {error && <Card><EmptyState illustration="error" title="Could not load people" action={<Button variant="secondary" onClick={load}>Try again</Button>} /></Card>}
      {!users && !error && <div className="space-y-3" role="status" aria-label="Loading"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>}

      {users && tab === 'people' && (
        <>
          <div role="group" aria-label="Filter by role" className="flex flex-wrap gap-2">
            {ROLE_FILTERS.map(([v, t]) => (
              <button key={v} aria-pressed={role === v} onClick={() => setRole(v)} className={cn('min-h-tap rounded-2xl border px-4 text-sm font-medium', role === v ? 'border-primary bg-primary-soft text-primary-soft-foreground' : 'border-border bg-surface text-muted-foreground hover:bg-surface-2')}>{t}</button>
            ))}
          </div>
          {shown.length === 0 ? <Card><EmptyState illustration="noHistory" title="No one here yet" description="Add the first person to get started." /></Card> : (
            <ul className="space-y-3">
              {shown.map((u) => (
                <li key={u._id}>
                  <Card className={cn('flex items-center gap-3', !u.isActive && 'opacity-60')}>
                    <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft font-display font-semibold text-primary-soft-foreground">{initials(u.name)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{u.name}{u._id === me._id && <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span>}</p>
                      <p className="truncate text-sm text-muted-foreground"><span className="capitalize">{u.role}</span>{u.flatId ? ` · ${u.flatId.number}` : ''} · {u.phone}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <Switch checked={u.isActive} onChange={(v) => toggle(u, v)} disabled={u._id === me._id} label={`${u.name} is ${u.isActive ? 'active' : 'inactive'}. Toggle access`} />
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {flats && tab === 'flats' && (
        flats.length === 0 ? <Card><EmptyState illustration="noHistory" title="No flats yet" description="Add your first flat." action={<Button onClick={() => setFlatOpen(true)} leftIcon={Plus}>Add flat</Button>} /></Card> : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {flats.map((f) => {
              const people = residentsByFlat[f._id] || [];
              return (
                <li key={f._id}>
                  <Card className="flex items-center gap-3">
                    <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-muted-foreground"><Building2 className="size-5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-semibold leading-tight">{f.number}</p>
                      <p className="truncate text-sm text-muted-foreground">{people.length ? people.map((p) => p.name).join(', ') : 'Vacant'}</p>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )
      )}

      <AddPersonModal open={personOpen} onOpenChange={setPersonOpen} flats={flats || []} onCreated={load} />
      <AddFlatModal open={flatOpen} onOpenChange={setFlatOpen} onCreated={load} />
    </div>
  );
}
