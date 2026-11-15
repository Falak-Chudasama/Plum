import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { playEnter } from '../../lib/sound';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconTrailing?: ReactNode;
  isLoading?: boolean;
  touchTarget?: boolean;
  suppressSound?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      iconTrailing,
      isLoading = false,
      touchTarget = true,
      suppressSound = false,
      disabled,
      onClick,
      children,
      className = '',
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || isLoading) return;
      if (!suppressSound) {
        playEnter();
      }
      onClick?.(e);
    };

    // Strict 7-step typography (Caption 12px for sm, Body 14px for md/lg)
    const sizeClasses = {
      sm: 'text-xs py-1.5 px-3.5 gap-1.5 min-h-[36px]',
      md: 'text-sm py-2 px-5 gap-2 min-h-[40px]',
      lg: 'text-sm py-2.5 px-6 gap-2.5 min-h-[48px]',
    }[size];

    // Optional 48dp minimum touch target guarantee on mobile
    const touchClass = touchTarget ? 'sm:min-h-0 min-h-[48px]' : '';

    const variantClasses = {
      primary: 'btn-glass-primary',
      secondary: 'btn-glass-secondary',
      ghost:
        'btn-interactive inline-flex items-center justify-center font-medium rounded-full text-stone-700 dark:text-stone-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-stone-900 dark:hover:text-white',
      danger:
        'btn-interactive inline-flex items-center justify-center font-bold rounded-full bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs',
    }[variant];

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        onClick={handleClick}
        className={`focus-ring select-none relative ${variantClasses} ${sizeClasses} ${touchClass} ${className}`}
        {...rest}
      >
        {isLoading ? (
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && iconTrailing && <span className="shrink-0">{iconTrailing}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
