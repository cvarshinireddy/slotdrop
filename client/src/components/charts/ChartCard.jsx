import { useId, useState } from 'react';
import { Table2, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * Chart frame shared by every chart:
 *  - `summary` is a one-sentence text alternative (read by screen readers instead of 30 SVG nodes)
 *  - a table view of the same numbers, so nothing is reachable only by hover or colour
 *  - `reloading` dims the previous render instead of swapping to a skeleton (no layout jump while refetching)
 */
export function ChartCard({ title, subtitle, summary, columns, rows, reloading = false, children }) {
  const [asTable, setAsTable] = useState(false);
  const id = useId();
  return (
    <Card as="section" aria-labelledby={`${id}-t`} aria-busy={reloading} className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`${id}-t`} className="text-xl font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <button onClick={() => setAsTable((t) => !t)} aria-pressed={asTable} className="flex min-h-tap shrink-0 items-center gap-2 rounded-2xl border border-border px-3 text-sm font-medium text-muted-foreground hover:bg-surface-2">
          {asTable ? <BarChart3 className="size-4" aria-hidden /> : <Table2 className="size-4" aria-hidden />}
          {asTable ? 'Chart' : 'Table'}
        </button>
      </header>
      <div className={cn('transition-opacity duration-base', reloading && 'opacity-50')}>
        {asTable ? (
          <div className="max-h-72 overflow-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <caption className="sr-only">{title}</caption>
              <thead className="sticky top-0 bg-surface-2 text-left text-muted-foreground"><tr>{columns.map((c) => <th key={c} scope="col" className="px-3 py-2 font-medium">{c}</th>)}</tr></thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => <tr key={i}>{r.map((cell, j) => <td key={j} className={cn('px-3 py-2', j > 0 && 'tabular-nums')}>{cell}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
        ) : (
          <div role="img" aria-label={summary}>{children}</div>
        )}
      </div>
    </Card>
  );
}

// Tooltip: value leads (strong), label follows (secondary); a short line-key marks the series (never a filled box).
export function TooltipBox({ title, value, unit, keyStyle = 'line' }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 shadow-lift">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-0.5 flex items-center gap-2 text-sm">
        <span aria-hidden className={cn('inline-block bg-primary', keyStyle === 'line' ? 'h-0.5 w-3 rounded' : 'size-2.5 rounded-sm')} />
        <strong className="font-display text-base font-semibold">{value}</strong><span className="text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}
