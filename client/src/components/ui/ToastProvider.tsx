import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { playNotification, playFailed, playBack } from '../../lib/sound';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
  title?: string;
}

interface ToastContextValue {
  push: (kind: ToastKind, message: string, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const iconByKind: Record<ToastKind, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
  error: <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
  info: <Info className="h-5 w-5 text-[#B266E6] dark:text-[#DBBFFF] shrink-0" />,
};

// Section 2.9 & 5.9: Exact 4200ms auto-dismiss duration
const TOAST_DURATION_MS = 4200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string, isManual = false) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (isManual) {
      playBack();
    }
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string, title?: string) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, kind, message, title }]);

      // Section 5.9: Audio pairing
      if (kind === 'error') {
        playFailed();
      } else {
        playNotification();
      }

      window.setTimeout(() => dismiss(id, false), TOAST_DURATION_MS);
    },
    [dismiss]
  );

  const success = useCallback((message: string, title?: string) => push('success', message, title), [push]);
  const error = useCallback((message: string, title?: string) => push('error', message, title), [push]);
  const warning = useCallback((message: string, title?: string) => push('warning', message, title), [push]);
  const info = useCallback((message: string, title?: string) => push('info', message, title), [push]);

  const contextValue = useMemo(
    () => ({ push, success, error, warning, info }),
    [push, success, error, warning, info]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        className="pointer-events-none fixed bottom-5 right-5 z-[120] flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white/95 dark:bg-[#181915]/95 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 shadow-lift backdrop-blur-md animate-slide-up"
          >
            {iconByKind[toast.kind]}
            <div className="flex-1 min-w-0">
              {toast.title && (
                <div className="font-semibold text-xs text-stone-900 dark:text-white mb-0.5">
                  {toast.title}
                </div>
              )}
              <div className="text-xs font-medium leading-relaxed text-stone-600 dark:text-stone-300">
                {toast.message}
              </div>
            </div>
            {/* 48dp Touch Target Dismiss Button */}
            <button
              type="button"
              onClick={() => dismiss(toast.id, true)}
              aria-label="Dismiss notice"
              className="focus-ring flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-lg p-1 text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
