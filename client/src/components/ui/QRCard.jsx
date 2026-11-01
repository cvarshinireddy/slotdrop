import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

/**
 * Handover pass: QR (for scanning) + 6-digit OTP (spoken fallback).
 * The QR tile uses the --qr-* tokens, which stay dark-on-light in dark mode so scanners can read it.
 */
export function QRCard({ qrSrc, otp, caption, className }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(otp);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked: the OTP is still visible on screen */ }
  }

  return (
    <div className={cn('flex flex-col items-center gap-4 rounded-3xl border border-border bg-surface p-6 text-center shadow-lift', className)}>
      <div className="rounded-2xl border border-border bg-qr-bg p-3">
        <img src={qrSrc} alt="Handover QR code. Show this to the guard." className="size-48 sm:size-56" width="224" height="224" />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Or tell the guard this code</p>
        <p
          className="mt-1 font-mono text-4xl font-semibold tracking-[0.3em] tabular-nums"
          aria-label={`One-time code: ${otp.split('').join(' ')}`}
        >
          {otp}
        </p>
      </div>
      {caption && <p className="text-sm text-muted-foreground">{caption}</p>}
      <Button variant="secondary" size="md" onClick={copy} leftIcon={copied ? Check : Copy} aria-live="polite">
        {copied ? 'Copied' : 'Copy code'}
      </Button>
    </div>
  );
}
