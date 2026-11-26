import { type ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

/**
 * PageShell - Clean SaaS Layout Substrate
 */
export function PageShell({ children, title, subtitle, action, icon }: PageShellProps) {
  return (
    <div className="relative min-h-screen flex flex-col pb-24 sm:pb-16 overflow-x-hidden">
      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-8 pt-20 sm:pt-24 flex-1 flex flex-col min-w-0">
        {(title || action) && (
          <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#181915] text-[#7E36B2] dark:text-[#DBBFFF] border border-black/[0.07] dark:border-white/[0.09]">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <h1 className="font-heading text-[22px] sm:text-2xl font-bold tracking-[-0.02em] leading-[1.2] text-stone-900 dark:text-white truncate">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mt-1 text-[13px] text-stone-500 dark:text-stone-400">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {action && <div className="flex flex-wrap items-center gap-2 shrink-0">{action}</div>}
          </header>
        )}
        <div className="min-w-0 flex-1 flex flex-col">{children}</div>
      </main>
    </div>
  );
}
