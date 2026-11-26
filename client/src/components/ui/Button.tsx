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

    // Balanced SaaS 4px/8px control scale, 100% flat (no shadows/glow)
    const sizeClasses = {
      sm: 'text-xs h-8 px-3 gap-1.5',
      md: 'text-[13px] h-9 px-4 gap-2',
      lg: 'text-sm h-10 px-5 gap-2',
    }[size];

    const touchClass = touchTarget ? 'sm:min-h-0 min-h-[40px]' : '';

    const variantClasses = {
      primary: 'btn-glass-primary shadow-none',
      secondary: 'btn-glass-secondary shadow-none',
      ghost:
        'btn-interactive shadow-none inline-flex items-center justify-center font-medium rounded-full text-stone-600 dark:text-stone-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] active:bg-black/[0.09] dark:active:bg-white/[0.13] hover:text-stone-900 dark:hover:text-white whitespace-nowrap',
      danger:
        'btn-interactive shadow-none inline-flex items-center justify-center font-semibold rounded-full bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white whitespace-nowrap',
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
