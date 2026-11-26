import { type HTMLAttributes } from 'react';

export type BadgeVariant =
  | 'academic'
  | 'session'
  | 'deadline'
  | 'urgent'
  | 'general'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'custom';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  customColor?: string;
  dot?: boolean;
}

const variantStyles: Record<
  Exclude<BadgeVariant, 'custom'>,
  { bg: string; text: string; dot: string; border: string }
> = {
  academic: {
    bg: 'bg-[#B266E6]/10 dark:bg-[#B266E6]/15',
    text: 'text-[#7E36B2] dark:text-[#DBBFFF]',
    dot: 'bg-[#B266E6]',
    border: 'border-[#B266E6]/25',
  },
  session: {
    bg: 'bg-[#89D66D]/15 dark:bg-[#89D66D]/20',
    text: 'text-[#2D6A2E] dark:text-[#89D66D]',
    dot: 'bg-[#89D66D]',
    border: 'border-[#89D66D]/30',
  },
  deadline: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
    border: 'border-amber-500/25',
  },
  urgent: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    text: 'text-rose-700 dark:text-rose-400',
    dot: 'bg-rose-500',
    border: 'border-rose-500/25',
  },
  general: {
    bg: 'bg-stone-500/10 dark:bg-stone-500/15',
    text: 'text-stone-700 dark:text-stone-300',
    dot: 'bg-stone-500',
    border: 'border-stone-500/20',
  },
  success: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    border: 'border-emerald-500/25',
  },
  warning: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
    border: 'border-amber-500/25',
  },
  danger: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    text: 'text-rose-700 dark:text-rose-400',
    dot: 'bg-rose-500',
    border: 'border-rose-500/25',
  },
  neutral: {
    bg: 'bg-stone-100 dark:bg-stone-800',
    text: 'text-stone-700 dark:text-stone-300',
    dot: 'bg-stone-400',
    border: 'border-stone-200 dark:border-stone-700',
  },
};

export function Badge({
  variant = 'neutral',
  customColor,
  dot = true,
  children,
  className = '',
  style,
  ...props
}: BadgeProps) {
  if (customColor) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.02em] border select-none max-w-full ${className}`}
        style={{
          backgroundColor: `${customColor}14`,
          color: customColor,
          borderColor: `${customColor}30`,
          ...style,
        }}
        {...props}
      >
        {dot && (
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ backgroundColor: customColor }}
          />
        )}
        <span className="truncate">{children}</span>
      </span>
    );
  }

  const v = variantStyles[variant === 'custom' ? 'neutral' : variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.02em] border select-none max-w-full ${v.bg} ${v.text} ${v.border} ${className}`}
      style={style}
      {...props}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${v.dot}`} />}
      <span className="truncate">{children}</span>
    </span>
  );
}
