import { useEffect, useId, useRef, useState } from 'react';
import { Camera, PackagePlus, RefreshCw } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const COURIERS = ['Amazon', 'Flipkart', 'Swiggy Instamart', 'Blinkit', 'Zomato', 'Myntra', 'Delhivery', 'BlueDart', 'Other'];
const SHELVES = Array.from({ length: 12 }, (_, i) => `S-${String(i + 1).padStart(2, '0')}`);
const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const label = 'mb-2 block text-sm font-semibold';

// Flat autocomplete following the ARIA combobox pattern: arrows move, Enter picks, Esc closes.
function FlatCombobox({ value, onPick, inputRef }) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const listId = useId();

  useEffect(() => {
    if (value || !query.trim()) { setOptions([]); return undefined; }
    const t = setTimeout(() => api.searchFlats(query).then((r) => { setOptions(r); setActive(0); }).catch(() => setOptions([])), 100);
    return () => clearTimeout(t);
  }, [query, value]);

  const pick = (f) => { onPick(f); setQuery(f.number); setOpen(false); };
  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && open && options[active]) { e.preventDefault(); pick(options[active]); }
    else if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef} id="flat" role="combobox" aria-expanded={open && options.length > 0} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
        value={query} onChange={(e) => { setQuery(e.target.value.toUpperCase()); onPick(null); setOpen(true); }} onKeyDown={onKey} onFocus={() => setOpen(true)}
        placeholder="Type flat, e.g. A-12" autoComplete="off" autoCapitalize="characters" inputMode="text"
        className="min-h-14 w-full rounded-2xl border border-border bg-surface px-4 font-display text-xl font-semibold tracking-wide placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-muted-foreground"
      />
      {open && options.length > 0 && !value && (
        <ul id={listId} role="listbox" aria-label="Matching flats" className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-lift">
          {options.map((f, i) => (
            <li key={f._id} id={`${listId}-${i}`} role="option" aria-selected={i === active} onMouseDown={(e) => { e.preventDefault(); pick(f); }}
              className={cn('flex min-h-tap cursor-pointer items-center px-4 font-medium', i === active && 'bg-primary-soft text-primary-soft-foreground')}>
              {f.number}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function QuickLog() {
  const { toast } = useToast();
  const flatRef = useRef(null);
  const startedAt = useRef(null); // for the "logged in Ns" feedback: the brief asks for < 15 seconds
  const [flat, setFlat] = useState(null);
  const [courier, setCourier] = useState('');
  const [shelf, setShelf] = useState(() => localStorage.getItem('slotdrop-last-shelf') || '');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(0);
  const [resetKey, setResetKey] = useState(0);

  const touch = () => { startedAt.current ??= Date.now(); };
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  function onPhoto(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    touch();
    setPhoto(f); setPreview(URL.createObjectURL(f));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const parcel = await api.createParcel({ flatId: flat._id, courier, shelfId: shelf || undefined, photo });
      const secs = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
      if (shelf) localStorage.setItem('slotdrop-last-shelf', shelf);
      toast({ variant: 'success', title: `Logged ${parcel.courier} for ${flat.number}`, description: `Resident notified${shelf ? ` · Shelf ${shelf}` : ''} · ${secs}s` });
      setCount((c) => c + 1);
      setFlat(null); setCourier(''); setPhoto(null); setPreview(''); startedAt.current = null; setResetKey((k) => k + 1);
      setTimeout(() => flatRef.current?.focus(), 50); // ready for the next parcel, hands never leave the keypad
    } catch (err) {
      toast({ variant: 'error', title: 'Could not log parcel', description: err.message });
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-6 pb-24" onChange={touch}>
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div><h1 className="text-3xl font-bold">Log a parcel</h1><p className="mt-1 text-muted-foreground">Flat, courier, shelf.</p></div>
        <p className="shrink-0 whitespace-nowrap rounded-full bg-surface-2 px-3 py-1 text-sm font-semibold" aria-live="polite">{count} logged today</p>
      </header>

      <div>
        <label htmlFor="flat" className={label}>Flat number</label>
        <FlatCombobox key={resetKey} value={flat} onPick={(f) => { touch(); setFlat(f); }} inputRef={flatRef} />
      </div>

      <fieldset>
        <legend className={label}>Courier</legend>
        <div className="flex flex-wrap gap-2">
          {COURIERS.map((c) => (
            <button key={c} type="button" aria-pressed={courier === c} onClick={() => { touch(); setCourier(c); }}
              className={cn('courier flex min-h-tap items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition-colors duration-fast', `courier-${slug(c)}`, courier === c ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface hover:bg-surface-2')}>
              <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: 'var(--c-fg)' }} />{c}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={label}>Shelf</legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {SHELVES.map((s) => (
            <button key={s} type="button" aria-pressed={shelf === s} onClick={() => { touch(); setShelf(shelf === s ? '' : s); }}
              className={cn('min-h-tap rounded-2xl border text-sm font-semibold tabular-nums transition-colors duration-fast', shelf === s ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface hover:bg-surface-2')}>{s}</button>
          ))}
        </div>
      </fieldset>

      <div>
        <span className={label}>Photo <span className="font-normal text-muted-foreground">(optional)</span></span>
        <label className="relative flex min-h-28 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-surface text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background hover:bg-surface-2">
          <input type="file" accept="image/*" capture="environment" onChange={onPhoto} className="sr-only" aria-label="Take a photo of the parcel" />
          {preview ? (
            <>
              <img src={preview} alt="Parcel preview" className="h-40 w-full object-cover" />
              <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-xl bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-soft"><RefreshCw className="size-4" aria-hidden />Retake</span>
            </>
          ) : <span className="flex items-center gap-2 text-sm font-medium"><Camera className="size-6" aria-hidden />Tap to take a photo</span>}
        </label>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto max-w-3xl lg:max-w-4xl">
          <Button type="submit" size="lg" block loading={busy} disabled={!flat || !courier} leftIcon={PackagePlus}>
            {flat && courier ? `Log ${courier} for ${flat.number}` : 'Pick a flat and courier'}
          </Button>
        </div>
      </div>
    </form>
  );
}
