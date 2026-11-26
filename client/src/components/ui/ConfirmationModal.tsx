import { type ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { playBack, playEnter } from '../../lib/sound';
import { Button } from './Button';
import { DynamicIslandModal } from './DynamicIslandModal';

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
  const handleClose = () => {
    playBack();
    onClose();
  };

  const handleConfirm = () => {
    playEnter();
    onConfirm();
  };

  return (
    <DynamicIslandModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-md"
      zIndexClass="z-[110]"
    >
      <div className="flex items-center justify-between gap-3 px-6 h-14 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${
              isDestructive
                ? 'bg-rose-500/10 text-rose-500'
                : 'bg-[#B266E6]/10 text-[#7E36B2] dark:text-[#DBBFFF]'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
          </div>
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-stone-900 dark:text-white truncate">
            {title}
          </h3>
        </div>

        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="focus-ring flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-6 py-5 text-[13.5px] text-stone-600 dark:text-stone-300 leading-relaxed">
        {description}
      </div>

      <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-black/[0.06] dark:border-white/[0.08] bg-stone-50/70 dark:bg-stone-900/40">
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
    </DynamicIslandModal>
  );
}
