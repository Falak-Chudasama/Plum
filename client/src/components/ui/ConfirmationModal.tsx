import { type ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { playBack, playEnter } from '../../lib/sound';
import { Button } from './Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  isLoading = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const handleClose = () => {
    playBack();
    onClose();
  };

  const handleConfirm = () => {
    playEnter();
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dimmed backdrop scrim (Section 2.9: 150ms ease-out) */}
      <div
        className="fixed inset-0 bg-stone-900/45 dark:bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Glass Panel Dialog Container (Section 2.9: 180ms cubic-bezier(0.16, 1, 0.3, 1)) */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-[2rem] glass-panel p-6 shadow-lift animate-scale-in"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {isDestructive ? (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
                <AlertTriangle className="h-5 w-5" />
              </div>
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#B266E6]/10 text-[#7E36B2] dark:text-[#DBBFFF]">
                <AlertTriangle className="h-5 w-5" />
              </div>
            )}
            <h3 className="font-heading font-bold text-stone-900 dark:text-white text-base">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="focus-ring flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3.5 text-sm text-stone-600 dark:text-stone-300 leading-relaxed font-sans">
          {description}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClose}
            disabled={isLoading}
            suppressSound
          >
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? 'danger' : 'primary'}
            size="sm"
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={isLoading}
            suppressSound
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
