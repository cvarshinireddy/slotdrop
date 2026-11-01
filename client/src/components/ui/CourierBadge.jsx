import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

// Brand-neutral courier tile: a per-courier hue (see tokens.css) + monogram. No trademarked logos.
export function CourierBadge({ courier, className }) {
  const initials = courier === 'Other' ? null : courier.split(' ').map((w) => w[0]).join('').slice(0, 2);
  return (
    <span
      className={cn('courier flex size-14 shrink-0 items-center justify-center rounded-2xl font-display text-xl font-bold', `courier-${slug(courier)}`, className)}
      style={{ backgroundColor: 'var(--c-bg)', color: 'var(--c-fg)' }}
      aria-hidden
    >
      {initials || <Package className="size-6" />}
    </span>
  );
}
