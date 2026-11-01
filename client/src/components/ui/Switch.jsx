import { cn } from '@/lib/utils';

// Accessible toggle (role="switch"). The 44px button is the tap target; the visible track is smaller.
export function Switch({ checked, onChange, label, disabled, className }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={cn('group flex min-h-tap min-w-tap items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:opacity-50', className)}>
      <span className={cn('relative h-6 w-10 rounded-full border transition-colors duration-fast', checked ? 'border-primary bg-primary' : 'border-border bg-surface-2')}>
        <span className={cn('absolute top-0.5 size-4 rounded-full shadow-soft transition-all duration-fast', checked ? 'left-[1.125rem] bg-primary-foreground' : 'left-0.5 bg-muted-foreground')} />
      </span>
    </button>
  );
}
