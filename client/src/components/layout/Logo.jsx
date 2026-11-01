import { PackageCheck } from 'lucide-react';

export function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-xl font-bold tracking-tight ${className}`}>
      <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground"><PackageCheck className="size-5" aria-hidden /></span>
      SlotDrop
    </span>
  );
}
