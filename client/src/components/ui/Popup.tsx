import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { playBack } from '../../lib/sound';

export interface PopupProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
}

const widthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-xl',
  xl: 'max-w-2xl',
} as const;

export function Popup({
  open,
  onClose,
  title,
  icon,
  children,
  footer,
  width = 'md',
}: PopupProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        playBack();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const handleClose = () => {
    playBack();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Dimmed full-viewport backdrop scrim blurring navbar & dock (Section 2.9: 150ms ease-out) */}
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Glass Panel Dialog Container (Section 2.9: 180ms cubic-bezier(0.16, 1, 0.3, 1)) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'dialog-title' : undefined}
        className={`relative z-10 max-h-[90vh] w-full overflow-y-auto ${widthClasses[width]} rounded-[2rem] glass-panel p-6 shadow-lift scrollbar-clean animate-scale-in`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#B266E6]/10 text-[#5C207E] dark:text-[#DBBFFF]">
                {icon}
              </div>
            )}
            {title && (
              <h2
                id="dialog-title"
                className="font-heading text-lg sm:text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 truncate"
              >
                {title}
              </h2>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close dialog"
            className="focus-ring flex h-10 w-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-full text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 text-sm text-stone-600 dark:text-stone-300">
          {children}
        </div>

        {footer && <div className="mt-6 flex items-center justify-end gap-3">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
