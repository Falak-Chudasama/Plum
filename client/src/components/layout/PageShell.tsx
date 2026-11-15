import { type ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

/**
 * PageShell - Fruit Family Layout Substrate (Section 4 & 2.8)
 * - Host Grotesk typography
 * - Pt-24 content offset below stationary floating navigation capsule
 * - Clean semantic container (ambient orbs and page entrance transitions driven by App and DirectionalPageTransition)
 */
export function PageShell({ children, title, subtitle, action, icon }: PageShellProps) {
  return (
    <div className="relative min-h-screen flex flex-col pb-24 sm:pb-16 overflow-x-clip">
      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6 pt-16 sm:pt-24 flex-1 flex flex-col">
        {(title || action) && (
          <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white dark:bg-[#181915] text-[#7E36B2] dark:text-[#DBBFFF] border border-black/[0.04] dark:border-white/[0.08] shadow-2xs">
                  {icon}
                </div>
              )}
              <div>
                {title && (
                  <h1 className="font-heading text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900 dark:text-white">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mt-1 text-xs sm:text-sm text-stone-500 dark:text-stone-400">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {action && <div className="flex items-center gap-2">{action}</div>}
          </header>
        )}
        {children}
      </main>
    </div>
  );
}
