import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ToastContext = createContext(null);

const VARIANTS = {
  success: { icon: CheckCircle2, cls: 'text-status-delivered' },
  error: { icon: AlertCircle, cls: 'text-status-overdue' },
  info: { icon: Info, cls: 'text-status-booked' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    ({ title, description, variant = 'info', duration = 4000 }) => {
      const id = ++idRef.current;
      setToasts((t) => [...t.slice(-2), { id, title, description, variant }]); // keep at most 3
      if (duration) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );
  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* aria-live region: polite announcements; errors use role="alert" so they interrupt */}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const { icon: Icon, cls } = VARIANTS[t.variant];
            return (
              <motion.div
                key={t.id}
                layout
                role={t.variant === 'error' ? 'alert' : 'status'}
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-border bg-surface p-3 pr-2 shadow-lift"
              >
                <Icon className={cn('mt-0.5 size-5 shrink-0', cls)} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{t.title}</p>
                  {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="flex min-h-tap min-w-tap items-center justify-center rounded-xl text-muted-foreground hover:bg-surface-2"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
