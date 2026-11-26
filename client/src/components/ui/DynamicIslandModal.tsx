import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { playBack } from '../../lib/sound';

interface DynamicIslandModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidthClass?: string;
  ariaLabelledBy?: string;
  ariaLabel?: string;
  className?: string;
  zIndexClass?: string;
}

/**
 * Shared portal modal shell modeled after Cherry's clean panel design with
 * Apple Dynamic Island top-down expansion animation and full-viewport backdrop
 * blur (including floating navbar).
 */
export function DynamicIslandModal({
  isOpen,
  onClose,
  children,
  maxWidthClass = 'max-w-lg',
  ariaLabelledBy,
  ariaLabel,
  className = '',
  zIndexClass = 'z-[100]',
}: DynamicIslandModalProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  const handleClose = useCallback(() => {
    playBack();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
      return () => {
        cancelAnimationFrame(raf1);
        if (raf2) cancelAnimationFrame(raf2);
      };
    }

    setIsVisible(false);
    const timer = window.setTimeout(() => {
      setShouldRender(false);
    }, 340);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!shouldRender) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.stopPropagation();
        handleClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [shouldRender, isOpen, handleClose]);

  if (!shouldRender || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-start justify-center pt-5 sm:pt-12 px-3 sm:px-6 pb-4 overflow-y-auto overflow-x-hidden`}
    >
      {/* Full-viewport blurred scrim including navbar */}
      <div
        className={`fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md transition-opacity duration-300 ease-out ${
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Dynamic Island Top-Down Morph Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
        className={`relative z-10 w-full ${maxWidthClass} max-h-[calc(100dvh-2.25rem)] sm:max-h-[calc(100dvh-4.75rem)] flex flex-col overflow-hidden origin-top will-change-transform bg-white dark:bg-[#161714] text-stone-900 dark:text-[#F3F4F1] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl transition-all duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isVisible
            ? 'translate-y-0 scale-x-100 scale-y-100 opacity-100 rounded-3xl pointer-events-auto'
            : '-translate-y-4 scale-x-[0.38] scale-y-[0.14] opacity-0 rounded-full pointer-events-none'
        } ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
