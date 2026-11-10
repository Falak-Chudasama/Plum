import { ReactNode } from 'react';
import { Header } from './Header';

interface PageShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageShell({ children, title, subtitle, action }: PageShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9F5] dark:bg-[#121310] text-stone-900 dark:text-[#F3F4F1] pb-24 sm:pb-12 transition-colors duration-200">
      <Header />
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-6 sm:pt-8 flex-1 flex flex-col">
        {(title || action) && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              {title && (
                <h1 className="font-display text-xl sm:text-2xl font-black tracking-tight text-stone-900 dark:text-white">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-1 text-xs sm:text-sm text-stone-500 dark:text-stone-400">
                  {subtitle}
                </p>
              )}
            </div>
            {action && <div className="flex items-center gap-2">{action}</div>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

