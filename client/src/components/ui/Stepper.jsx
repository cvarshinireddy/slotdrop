import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Vertical status timeline. steps: [{ key, label, detail?, state: 'done' | 'current' | 'todo' }]
 * Rendered as an ordered list so assistive tech announces "item 2 of 4".
 */
export function Stepper({ steps, className }) {
  return (
    <ol className={cn('relative', className)} aria-label="Parcel progress">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={step.key} className="relative flex gap-3 pb-6 last:pb-0" aria-current={step.state === 'current' ? 'step' : undefined}>
            {!last && (
              <span aria-hidden className={cn('absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-0.5', step.state === 'done' ? 'bg-primary' : 'bg-border')} />
            )}
            <span
              className={cn(
                'relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                step.state === 'done' && 'border-primary bg-primary text-primary-foreground',
                step.state === 'current' && 'border-primary bg-primary-soft text-primary-soft-foreground ring-4 ring-primary/15',
                step.state === 'todo' && 'border-border bg-surface text-muted-foreground'
              )}
            >
              {step.state === 'done' ? <Check className="size-4" aria-hidden /> : i + 1}
            </span>
            <div className="min-h-7 pt-0.5">
              <p className={cn('text-sm font-semibold', step.state === 'todo' && 'text-muted-foreground')}>{step.label}</p>
              {step.detail && <p className="text-xs text-muted-foreground">{step.detail}</p>}
              <span className="sr-only">{step.state === 'done' ? 'Completed' : step.state === 'current' ? 'Current step' : 'Upcoming'}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
