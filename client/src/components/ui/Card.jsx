import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// `animate` gives the standard "card enter" (fade + 8px rise, 200ms). `interactive` adds hover lift.
export const Card = forwardRef(function Card({ className, animate = false, interactive = false, as = 'div', ...props }, ref) {
  const Comp = animate ? motion[as] : as;
  const motionProps = animate
    ? { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] } }
    : {};
  return (
    <Comp
      ref={ref}
      className={cn(
        'rounded-2xl border border-border bg-surface p-4 shadow-soft',
        interactive && 'transition-shadow duration-base hover:shadow-lift',
        className
      )}
      {...motionProps}
      {...props}
    />
  );
});

export const CardTitle = ({ className, ...p }) => <h3 className={cn('font-display text-xl font-semibold', className)} {...p} />;
export const CardDescription = ({ className, ...p }) => <p className={cn('text-sm text-muted-foreground', className)} {...p} />;
