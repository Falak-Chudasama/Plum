import { type ButtonHTMLAttributes } from 'react';
import { playEnter } from '../../lib/sound';

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

/**
 * LemonSwitch - Section 5.2 Fruit Family Design System
 * - Exact Dimensions: 50px width x 30px height track, 26px circular thumb, 22px travel distance
 * - Enforces minimum 48px x 48px tactile touch target
 * - Bound to Plum derived accent tokens (#B266E6 / #DBBFFF)
 * - Fires tactile audio feedback via playEnter()
 */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
  ...props
}: SwitchProps) {
  const handleToggle = () => {
    if (disabled) return;
    playEnter();
    onChange(!checked);
  };

  return (
    <div className={`flex items-center justify-between gap-4 select-none ${className}`}>
      {(label || description) && (
        <div className="flex-1 min-w-0 pr-2">
          {label && (
            <label
              onClick={handleToggle}
              className={`block text-sm font-semibold tracking-tight cursor-pointer ${
                disabled ? 'text-stone-400 dark:text-stone-600' : 'text-stone-900 dark:text-stone-100'
              }`}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}

      {/* 48dp Minimum Touch Target Container */}
      <div className="relative flex items-center justify-center min-w-[48px] min-h-[48px] shrink-0">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={handleToggle}
          className={`focus-ring btn-interactive relative inline-flex h-[30px] w-[50px] shrink-0 cursor-pointer rounded-full p-[2px] transition-colors duration-180 ease-in-out disabled:cursor-not-allowed disabled:opacity-45 ${
            checked
              ? 'bg-[#B266E6] dark:bg-[#DBBFFF]'
              : 'bg-[#E7E5E4] dark:bg-[#292524]'
          }`}
          {...props}
        >
          <span className="sr-only">{label || 'Toggle switch'}</span>
          {/* 26px Thumb with 22px Travel (Section 2.9: 180ms cubic-bezier(0.16, 1, 0.3, 1)) */}
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-[26px] w-[26px] rounded-full shadow-none border border-black/[0.06] dark:border-white/[0.14] transition-transform duration-180 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              checked
                ? 'translate-x-[20px] bg-white dark:bg-[#121310]'
                : 'translate-x-0 bg-white dark:bg-[#E0DDD5]'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
