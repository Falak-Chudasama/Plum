import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react'

export type ToastKind = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  kind: ToastKind
  message: string
  title?: string
}

interface ToastContextValue {
  push: (kind: ToastKind, message: string, title?: string) => void
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  warning: (message: string, title?: string) => void
  info: (message: string, title?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const iconByKind: Record<ToastKind, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
  error: <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
  info: <Info className="h-5 w-5 text-plum-flesh dark:text-plum-pastel shrink-0" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (kind: ToastKind, message: string, title?: string) => {
      const id = crypto.randomUUID()
      setToasts((prev) => [...prev, { id, kind, message, title }])
      window.setTimeout(() => dismiss(id), 4500)
    },
    [dismiss]
  )

  const success = useCallback((message: string, title?: string) => push('success', message, title), [push])
  const error = useCallback((message: string, title?: string) => push('error', message, title), [push])
  const warning = useCallback((message: string, title?: string) => push('warning', message, title), [push])
  const info = useCallback((message: string, title?: string) => push('info', message, title), [push])

  const contextValue = useMemo(
    () => ({ push, success, error, warning, info }),
    [push, success, error, warning, info]
  )

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white/95 dark:bg-[#181915]/95 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 shadow-lift backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200"
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
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notice"
              className="rounded-lg p-1 text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

