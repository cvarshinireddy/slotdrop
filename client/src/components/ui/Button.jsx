import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const button = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-medium transition-colors duration-fast disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'border border-border bg-surface text-foreground shadow-soft hover:bg-surface-2',
        soft: 'bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft/70',
        ghost: 'text-foreground hover:bg-surface-2',
        // success/danger reuse the verified status fg/bg pair (inverted) so contrast holds in both themes
        success: 'bg-status-delivered-fg text-status-delivered-bg hover:bg-status-delivered-fg/90',
        danger: 'bg-status-overdue-fg text-status-overdue-bg hover:bg-status-overdue-fg/90',
      },
      size: {
        md: 'min-h-tap px-4 text-sm', // 44px — the minimum tap target
        lg: 'min-h-14 px-6 text-base', // 56px — primary actions ("Choose a slot")
        icon: 'min-h-tap min-w-tap p-0',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export const Button = forwardRef(function Button(
  { className, variant, size, block, loading = false, disabled, leftIcon: Left, rightIcon: Right, children, ...props },
  ref
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className={cn(button({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : Left && <Left className="size-4" aria-hidden />}
      {children}
      {!loading && Right && <Right className="size-4" aria-hidden />}
    </motion.button>
  );
});
