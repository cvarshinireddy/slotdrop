import { cn } from '@/lib/utils';

// Pulse is a CSS animation, so the global prefers-reduced-motion rule switches it off automatically.
export const Skeleton = ({ className, ...props }) => (
  <div aria-hidden className={cn('animate-pulse rounded-xl bg-surface-2', className)} {...props} />
);

// Mirrors the parcel card layout so content does not jump when data arrives.
export function ParcelCardSkeleton() {
  return (
    <div role="status" aria-label="Loading parcel" className="flex gap-4 rounded-2xl border border-border bg-surface p-4 shadow-soft">
      <Skeleton className="size-16 shrink-0 rounded-2xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="mt-3 h-11 w-full rounded-2xl" />
      </div>
    </div>
  );
}
