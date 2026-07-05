import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useToastStore } from '@/stores/toastStore';

const icons = {
  success: <CheckCircle2 size={17} className="text-good" />,
  error: <XCircle size={17} className="text-bad" />,
  default: <Info size={17} className="text-primary" />,
};

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="fixed bottom-5 right-5 z-[300] flex flex-col gap-2.5 w-[340px] max-w-[calc(100vw-40px)]">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 30, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="glass border border-line-strong rounded-xl2 shadow-modal p-3.5 flex gap-3 items-start"
            role="status"
          >
            <span className="mt-0.5 shrink-0">{icons[t.variant]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-ink leading-snug">{t.title}</p>
              {t.description && <p className="text-xs text-ink-dim mt-0.5 leading-relaxed">{t.description}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="shrink-0 p-1 -m-1 rounded text-ink-faint hover:text-ink transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
