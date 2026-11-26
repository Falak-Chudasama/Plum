import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { playBack } from '../../lib/sound';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  onClear?: () => void;
  error?: string;
  helperText?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, icon, onClear, error, helperText, value, className = '', disabled, ...props }, ref) => {
    const handleClear = () => {
      if (disabled) return;
      playBack();
      onClear?.();
    };

    return (
      <div className="w-full text-left">
        {label && (
          <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 mb-1.5 uppercase tracking-wider">
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {icon && (
            <div className="pointer-events-none absolute left-3.5 flex items-center text-stone-400 dark:text-stone-500 [&>svg]:h-4 [&>svg]:w-4">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            value={value}
            disabled={disabled}
            className={`focus-ring w-full h-9 rounded-xl bg-white dark:bg-stone-900/80 py-2 text-[13px] font-medium text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 border transition hover:border-stone-300 dark:hover:border-stone-700 disabled:opacity-50 disabled:cursor-not-allowed ${
              icon ? 'pl-9' : 'pl-3.5'
            } ${onClear && value ? 'pr-9' : 'pr-3.5'} ${
              error
                ? 'border-red-600 dark:border-red-400 ring-2 ring-red-500/20'
                : 'border-black/[0.08] dark:border-white/[0.10]'
            } ${className}`}
            {...props}
          />

          {onClear && value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear text"
              className="absolute right-3 flex h-6 w-6 items-center justify-center rounded-full text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-200 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {error && (
          <p className="mt-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

TextField.displayName = 'TextField';
