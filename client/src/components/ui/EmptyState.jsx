import { cn } from '@/lib/utils';

// Illustrations are inline SVG using token classes, so they re-theme in dark mode with zero extra assets.
const base = 'fill-none stroke-primary';
const tint = 'fill-primary/10 stroke-primary';

const ILLUSTRATIONS = {
  noParcels: (
    <svg viewBox="0 0 160 120" aria-hidden className="h-32 w-40">
      <ellipse cx="80" cy="104" rx="46" ry="6" className="fill-foreground/10" />
      <path d="M44 54 80 36l36 18v36L80 108 44 90z" className={tint} strokeWidth="3" strokeLinejoin="round" />
      <path d="M44 54 80 72l36-18M80 72v36" className={base} strokeWidth="3" strokeLinejoin="round" />
      <path d="M62 45l36 18" className={base} strokeWidth="3" strokeLinecap="round" />
      <circle cx="124" cy="30" r="10" className="fill-status-delivered-bg stroke-status-delivered" strokeWidth="3" />
      <path d="m119.5 30 3.5 3.5 6-7" className="fill-none stroke-status-delivered" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 34h10M31 29v10" className={base} strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  noHistory: (
    <svg viewBox="0 0 160 120" aria-hidden className="h-32 w-40">
      <ellipse cx="80" cy="106" rx="44" ry="6" className="fill-foreground/10" />
      <rect x="44" y="18" width="72" height="84" rx="12" className={tint} strokeWidth="3" />
      <circle cx="62" cy="42" r="5" className="fill-primary stroke-none" />
      <circle cx="62" cy="62" r="5" className="fill-primary/50 stroke-none" />
      <circle cx="62" cy="82" r="5" className="fill-primary/25 stroke-none" />
      <path d="M76 42h24M76 62h24M76 82h16" className={base} strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  noNotifications: (
    <svg viewBox="0 0 160 120" aria-hidden className="h-32 w-40">
      <ellipse cx="80" cy="106" rx="40" ry="6" className="fill-foreground/10" />
      <path d="M52 78V58a28 28 0 0 1 56 0v20l8 10H44z" className={tint} strokeWidth="3" strokeLinejoin="round" />
      <path d="M72 96a8 8 0 0 0 16 0" className={base} strokeWidth="3" strokeLinecap="round" />
      <path d="M80 22v8" className={base} strokeWidth="3" strokeLinecap="round" />
      <path d="M118 36l6-6M128 52h8M34 40l-6-4" className={base} strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 160 120" aria-hidden className="h-32 w-40">
      <ellipse cx="80" cy="106" rx="44" ry="6" className="fill-foreground/10" />
      <path d="M46 56 80 40l34 16v32L80 104 46 88z" className="fill-status-overdue-bg stroke-status-overdue" strokeWidth="3" strokeLinejoin="round" />
      <path d="M46 56l34 16 34-16M80 72v32" className="fill-none stroke-status-overdue" strokeWidth="3" strokeLinejoin="round" />
      <path d="M80 14v18M80 40v.01" className="fill-none stroke-status-overdue" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
};

export function EmptyState({ illustration = 'noParcels', title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      {ILLUSTRATIONS[illustration]}
      <h3 className="mt-4 font-display text-xl font-semibold text-balance">{title}</h3>
      {description && <p className="mt-1 max-w-xs text-sm text-muted-foreground text-balance">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
