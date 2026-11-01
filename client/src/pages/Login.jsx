import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react';
import { Button } from '@/components/ui';
import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { homeFor } from '@/components/layout/RequireRole';
import { useAuth } from '@/context/AuthContext';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/lib/demo';
import { API_MODE } from '@/lib/api';

const inputCls = 'min-h-tap w-full rounded-2xl border border-border bg-surface px-4 text-base placeholder:text-muted-foreground';

export default function Login() {
  const { user, login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try { await login(identifier.trim(), password); } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Logo className="text-primary-foreground [&>span]:bg-primary-foreground [&>span]:text-primary" />
        <div>
          <h1 className="max-w-md text-4xl font-bold text-balance">Your parcel. Your time. No more missed deliveries.</h1>
          <p className="mt-4 max-w-md text-base opacity-90">Pick the exact hour you want your parcel handed over. Show a QR at the gate. Done.</p>
        </div>
        <p className="text-sm opacity-80">Built for apartment societies across India.</p>
      </div>

      <div className="flex flex-col px-6 py-6 sm:px-12">
        <div className="flex items-center justify-between lg:justify-end"><Logo className="lg:hidden" /><ThemeToggle /></div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h2 className="text-3xl font-bold">Welcome back</h2>
          <p className="mt-1 text-muted-foreground">Sign in with your email or mobile number.</p>

          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            <div>
              <label htmlFor="identifier" className="mb-1.5 block text-sm font-medium">Email or mobile</label>
              <input id="identifier" className={inputCls} value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" inputMode="email" placeholder="you@example.com" required />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Password</label>
              <div className="relative">
                <input id="password" type={show ? 'text' : 'password'} className={`${inputCls} pr-14`} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} className="absolute right-0 top-0 flex min-h-tap min-w-tap items-center justify-center text-muted-foreground">
                  {show ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
                </button>
              </div>
            </div>
            {error && (
              <p role="alert" className="flex items-start gap-2 rounded-2xl bg-status-overdue-bg p-3 text-sm text-status-overdue-fg"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />{error}</p>
            )}
            <Button type="submit" size="lg" block loading={busy} disabled={!identifier || !password} leftIcon={LogIn}>Sign in</Button>
          </form>

          <section aria-labelledby="demo" className="mt-8 rounded-2xl border border-dashed border-border p-4">
            <h3 id="demo" className="text-sm font-semibold">Demo accounts{API_MODE === 'mock' ? ' (runs in your browser)' : ''}</h3>
            <p className="text-xs text-muted-foreground">Tap one to fill the form. Password is {DEMO_PASSWORD}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {DEMO_ACCOUNTS.map((a) => (
                <button key={a.role} type="button" onClick={() => { setIdentifier(a.identifier); setPassword(DEMO_PASSWORD); setError(''); }} className="min-h-tap rounded-xl border border-border bg-surface px-3 py-2 text-left hover:bg-surface-2">
                  <span className="block text-sm font-semibold">{a.role}</span>
                  <span className="block text-xs text-muted-foreground">{a.hint}</span>
                </button>
              ))}
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
