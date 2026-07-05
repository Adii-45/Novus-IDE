import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id: idProp, ...props }, ref) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-[13px] font-medium text-ink-dim">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={Boolean(error)}
          className={cn(
            'w-full h-10 px-3.5 rounded-xl2 bg-surface-raised border text-sm text-ink placeholder:text-ink-faint',
            'transition-colors duration-150 focus:outline-none',
            error
              ? 'border-bad/50 focus:border-bad'
              : 'border-line-strong focus:border-primary/60 hover:border-line-strong',
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-bad">{error}</p>
        ) : hint ? (
          <p className="text-xs text-ink-faint">{hint}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id: idProp, ...props }, ref) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-[13px] font-medium text-ink-dim">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            'w-full min-h-[84px] p-3.5 rounded-xl2 bg-surface-raised border text-sm text-ink placeholder:text-ink-faint resize-none',
            'transition-colors duration-150 focus:outline-none',
            error ? 'border-bad/50 focus:border-bad' : 'border-line-strong focus:border-primary/60',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-bad">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
