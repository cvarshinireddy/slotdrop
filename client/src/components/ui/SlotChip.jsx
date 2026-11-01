import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * A bookable time window. States: default, selected, suggested, full/closed (disabled WITH a visible reason).
 * Disabled chips use aria-disabled (not `disabled`) so they stay focusable and screen readers can hear why.
 */
export function SlotChip({ label, remaining, selected = false, suggested = false, reason, onSelect, className }) {
  const reasonId = useId();
  const unavailable = Boolean(reason);

  return (
    <div className="flex flex-col gap-1">
      <motion.button
        type="button"
        aria-pressed={selected}
        aria-disabled={unavailable || undefined}
        aria-describedby={unavailable ? reasonId : undefined}
        onClick={() => !unavailable && onSelect?.()}
        whileTap={unavailable ? undefined : { scale: 0.96 }}
        animate={selected ? { scale: [1, 1.04, 1] } : { scale: 1 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'relative flex min-h-14 w-full flex-col items-start justify-center rounded-2xl border px-3 py-2 text-left transition-colors duration-fast',
          selected && 'border-primary bg-primary text-primary-foreground shadow-soft',
          !selected && !unavailable && 'border-border bg-surface hover:border-primary/50 hover:bg-surface-2',
          !selected && suggested && !unavailable && 'border-primary/60 bg-primary-soft',
          unavailable && 'cursor-not-allowed border-dashed border-border bg-surface-2 text-muted-foreground',
          className
        )}
      >
        <span className="flex w-full items-center justify-between gap-2">
          <span className={cn('text-sm font-semibold', unavailable && 'line-through decoration-1')}>{label}</span>
          {selected && <Check className="size-4" aria-hidden />}
        </span>
        <span className={cn('text-xs', selected ? 'text-primary-foreground/85' : 'text-muted-foreground')}>
          {unavailable ? 'Unavailable' : `${remaining} ${remaining === 1 ? 'spot' : 'spots'} left`}
        </span>
      </motion.button>
      {suggested && !unavailable && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
          <Sparkles className="size-3" aria-hidden /> Suggested for you
        </span>
      )}
      {unavailable && <span id={reasonId} className="text-xs text-muted-foreground">{reason}</span>}
    </div>
  );
}
