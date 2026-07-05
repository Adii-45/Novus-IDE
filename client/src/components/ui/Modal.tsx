import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** Hide the default header (title/close) for fully custom content. */
  bare?: boolean;
}

export function Modal({ open, onClose, title, description, children, className, bare }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            className={cn(
              'relative w-full max-w-lg card shadow-modal p-6 max-h-[85vh] overflow-y-auto',
              className
            )}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {!bare && (
              <div className="flex items-start justify-between mb-5">
                <div>
                  {title && <h2 className="text-lg font-semibold text-ink">{title}</h2>}
                  {description && <p className="text-sm text-ink-dim mt-1">{description}</p>}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="p-1.5 -m-1 rounded-lg text-ink-faint hover:text-ink hover:bg-white/[0.06] transition-colors"
                >
                  <X size={17} />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
