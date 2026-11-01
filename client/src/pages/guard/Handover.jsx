import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import { CameraOff, Check, Keyboard, ScanLine, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const inputCls = 'min-h-14 w-full rounded-2xl border border-border bg-surface px-4 text-center font-mono text-2xl font-semibold uppercase tracking-[0.3em] placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground';

// Full-screen outcome: big green success or red failure. role="alert" so screen readers announce it immediately.
function Result({ result, onDone }) {
  const ok = result.ok;
  useEffect(() => { if (!ok) return undefined; const t = setTimeout(onDone, 6000); return () => clearTimeout(t); }, [ok, onDone]);
  return (
    <motion.div role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
      className={cn('fixed inset-0 z-[70] flex flex-col items-center justify-center gap-6 p-8 text-center', ok ? 'bg-status-delivered-bg text-status-delivered-fg' : 'bg-status-overdue-bg text-status-overdue-fg')}>
      <motion.span initial={{ scale: 0.4 }} animate={ok ? { scale: [0.4, 1.1, 1] } : { scale: 1, x: [0, -14, 14, -10, 10, -4, 4, 0] }} transition={{ duration: ok ? 0.3 : 0.4 }}
        className={cn('flex size-28 items-center justify-center rounded-full border-4', ok ? 'border-status-delivered bg-surface' : 'border-status-overdue bg-surface')}>
        {ok ? (
          <svg viewBox="0 0 24 24" className="size-16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.12, duration: 0.22 }} />
          </svg>
        ) : <X className="size-16" strokeWidth={2.5} aria-hidden />}
      </motion.span>
      <div>
        <h2 className="text-4xl font-bold">{ok ? 'Release the parcel' : 'Do not release'}</h2>
        {ok ? (
          <p className="mt-2 text-xl">{result.data.parcel.courier} for {result.data.parcel.flatId.number}{result.data.deliveredTo !== 'resident' && <><br />Collected by {result.data.deliveredTo}</>}{result.data.parcel.shelfId && <><br />Shelf {result.data.parcel.shelfId}</>}</p>
        ) : <p className="mt-2 text-xl">{result.message}</p>}
      </div>
      <Button size="lg" variant={ok ? 'success' : 'danger'} onClick={onDone} className="min-w-48" autoFocus>{ok ? 'Next parcel' : 'Try again'}</Button>
    </motion.div>
  );
}

function Scanner({ onDecode, onUnavailable }) {
  const decodeRef = useRef(onDecode);
  decodeRef.current = onDecode;

  useEffect(() => {
    let cancelled = false;
    let started = false;
    const scanner = new Html5Qrcode('qr-reader', { verbose: false });
    const qrbox = (w, h) => { const s = Math.floor(Math.min(w, h) * 0.7); return { width: s, height: s }; };

    const starting = scanner
      .start({ facingMode: 'environment' }, { fps: 10, qrbox }, (text) => decodeRef.current(text), () => {})
      .then(() => { started = true; })
      .catch((e) => {
        if (!cancelled) onUnavailable(/denied|permission/i.test(String(e)) ? 'Camera access is blocked. Allow it in the browser, or enter the code instead.' : 'No camera found. Enter the code instead.');
      });

    // html5-qrcode THROWS synchronously if stop() is called on a scanner that never started (camera denied,
    // or React StrictMode's mount/unmount/mount). So only stop after a successful start, and never let cleanup throw.
    return () => {
      cancelled = true;
      starting.finally(async () => {
        try { if (started) await scanner.stop(); scanner.clear(); } catch { /* already stopped */ }
      });
    };
  }, [onUnavailable]);

  return <div id="qr-reader" className="absolute inset-0 [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />;
}

export default function Handover() {
  const { state } = useLocation();
  const [tab, setTab] = useState('scan');
  const [scanError, setScanError] = useState('');
  const [kind, setKind] = useState('otp');
  const [flat, setFlat] = useState(state?.flat || '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const lock = useRef(false);

  const run = useCallback(async (body) => {
    if (lock.current) return; // the scanner fires many times per second; only handle the first read
    lock.current = true; setBusy(true);
    try { setResult({ ok: true, data: await api.verifyHandover(body) }); }
    catch (e) { setResult({ ok: false, message: e.message || 'Could not verify.' }); }
    finally { setBusy(false); }
  }, []);

  const done = useCallback(() => { setResult(null); setCode(''); lock.current = false; }, []);
  const onUnavailable = useCallback((m) => { setScanError(m); setTab('code'); }, []);

  const submit = (e) => { e.preventDefault(); run({ flat: flat.trim(), ...(kind === 'otp' ? { otp: code } : { delegateCode: code }) }); };
  const valid = /^[A-Za-z]-\d{3,4}$/.test(flat.trim()) && (kind === 'otp' ? /^\d{6}$/.test(code) : /^[A-Za-z0-9]{6}$/.test(code));

  return (
    <div className="lg:mx-auto lg:max-w-md">
      <div role="tablist" aria-label="Verification method" className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 gap-1 rounded-2xl bg-surface/90 p-1 shadow-lift backdrop-blur lg:static lg:mb-4 lg:translate-x-0 lg:bg-surface-2 lg:shadow-none">
        {[['scan', 'Scan QR', ScanLine], ['code', 'Enter code', Keyboard]].map(([id, text, Icon]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cn('flex min-h-tap items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors', tab === id ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-surface-2')}>
            <Icon className="size-4" aria-hidden />{text}
          </button>
        ))}
      </div>

      {tab === 'scan' && (
        <section aria-label="QR scanner" className="relative h-[calc(100dvh-4rem)] overflow-hidden bg-foreground lg:h-[28rem] lg:rounded-3xl">
          <Scanner onDecode={(qrToken) => run({ qrToken })} onUnavailable={onUnavailable} />
          <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="size-[70%] max-h-72 max-w-72 rounded-3xl border-4 border-primary-foreground/80 shadow-[0_0_0_9999px_hsl(var(--foreground)/0.45)]" /></div>
          <p className="absolute inset-x-0 bottom-6 text-center text-sm font-medium text-background" aria-live="polite">{busy ? 'Checking…' : 'Point at the resident\'s QR code'}</p>
        </section>
      )}

      {tab === 'code' && (
        <form onSubmit={submit} className="space-y-5 px-4 pb-6 pt-20 lg:px-0 lg:pt-0">
          <header><h1 className="text-3xl font-bold">Enter code</h1><p className="mt-1 text-muted-foreground">Ask for the flat number and the 6-digit code.</p></header>
          {scanError && <p role="status" className="flex items-start gap-2 rounded-2xl bg-status-received-bg p-3 text-sm text-status-received-fg"><CameraOff className="mt-0.5 size-4 shrink-0" aria-hidden />{scanError}</p>}
          <div><label htmlFor="h-flat" className="mb-2 block text-sm font-semibold">Flat number</label>
            <input id="h-flat" value={flat} onChange={(e) => setFlat(e.target.value.toUpperCase())} placeholder="A-1204" className={inputCls} autoComplete="off" autoCapitalize="characters" /></div>
          <div role="group" aria-label="Code type" className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
            {[['otp', 'Resident OTP'], ['delegate', 'Neighbour code']].map(([k, t]) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => { setKind(k); setCode(''); }} className={cn('min-h-tap rounded-xl text-sm font-semibold', kind === k ? 'bg-surface shadow-soft' : 'text-muted-foreground')}>{t}</button>
            ))}
          </div>
          <div><label htmlFor="h-code" className="mb-2 block text-sm font-semibold">{kind === 'otp' ? '6-digit OTP' : '6-character code'}</label>
            <input id="h-code" value={code} onChange={(e) => setCode(kind === 'otp' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 6))}
              inputMode={kind === 'otp' ? 'numeric' : 'text'} autoComplete="off" placeholder={kind === 'otp' ? '000000' : 'K7M2QX'} className={inputCls} /></div>
          <Button type="submit" size="lg" block variant="success" loading={busy} disabled={!valid} leftIcon={Check}>Verify and hand over</Button>
        </form>
      )}

      <AnimatePresence>{result && <Result key="r" result={result} onDone={done} />}</AnimatePresence>
    </div>
  );
}
