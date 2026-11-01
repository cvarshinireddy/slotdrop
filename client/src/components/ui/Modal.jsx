import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Accessible modal built on Radix Dialog: focus is trapped, Esc closes, focus returns to the trigger,
 * and `title` is mandatory because dialogs must have an accessible name.
 * Mobile: bottom sheet. Desktop: centred card.
 */
export function Modal({ open, onOpenChange, title, description, children }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[2px]"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              />
            </Dialog.Overlay>
            <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
              <Dialog.Content asChild forceMount>
                <motion.div
                  className="safe-bottom max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl border border-border bg-surface p-6 shadow-lift sm:max-w-md sm:rounded-3xl"
                  initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
                  transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Dialog.Title className="font-display text-xl font-semibold">{title}</Dialog.Title>
                      <Dialog.Description className={description ? 'mt-1 text-sm text-muted-foreground' : 'sr-only'}>
                        {description || title}
                      </Dialog.Description>
                    </div>
                    <Dialog.Close aria-label="Close" className="-mr-2 -mt-2 flex min-h-tap min-w-tap items-center justify-center rounded-xl text-muted-foreground hover:bg-surface-2">
                      <X className="size-5" aria-hidden />
                    </Dialog.Close>
                  </div>
                  <div className="mt-5">{children}</div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
