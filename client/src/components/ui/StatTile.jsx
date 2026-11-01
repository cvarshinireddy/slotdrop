import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Card } from './Card';
import { cn } from '@/lib/utils';

// Delta colour = direction x whether "up" is good. Always paired with an arrow + words, never colour alone.
function Delta({ value, previous, goodWhen, vs }) {
  if (value == null || !previous) return null;
  const pct = Math.round(((value - previous) / previous) * 100);
  const dir = pct === 0 ? 'flat' : pct > 0 ? 'up' : 'down';
  const tone = dir === 'flat' || goodWhen === 'neutral' ? 'text-muted-foreground' : dir === goodWhen ? 'text-status-delivered-fg' : 'text-status-overdue-fg';
  const Icon = dir === 'flat' ? Minus : dir === 'up' ? ArrowUpRight : ArrowDownRight;
  return (
    <p className={cn('mt-1 flex items-center gap-1 text-xs font-medium', tone)}>
      <Icon className="size-3.5" aria-hidden />
      {dir === 'flat' ? 'No change' : `${pct > 0 ? '+' : ''}${pct}%`}<span className="font-normal text-muted-foreground"> vs {vs}</span>
    </p>
  );
}

/** KPI stat tile: label, value (proportional figures), optional delta vs the previous period, optional footnote. */
export function StatTile({ label, value, unit, delta, note, noteTone, className }) {
  return (
    <Card className={cn('flex flex-col justify-between', className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div>
        <p className="mt-2 font-display text-3xl font-semibold leading-none">
          {value ?? '—'}{unit && value != null && <span className="ml-1 text-base font-medium text-muted-foreground">{unit}</span>}
        </p>
        {delta && <Delta {...delta} />}
        {note && <p className={cn('mt-1 text-xs', noteTone || 'text-muted-foreground')}>{note}</p>}
      </div>
    </Card>
  );
}
