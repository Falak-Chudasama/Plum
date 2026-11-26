import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
  elevation?: 'none' | 'soft' | 'floating' | 'lift';
  radius?: '2xl' | '3xl';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      interactive = false,
      elevation = 'none',
      radius = '2xl',
      className = '',
      ...props
    },
    ref
  ) => {
    const shadowClass = {
      none: '',
      soft: 'shadow-none',
      floating: 'shadow-floating',
      lift: 'shadow-lift',
    }[elevation];

    const radiusClass = radius === '3xl' ? 'rounded-3xl' : 'rounded-2xl';

    const interactiveClass = interactive
      ? 'cursor-pointer transition-[transform,border-color,background-color] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[0.5px] hover:border-stone-300 dark:hover:border-stone-700 active:scale-[0.992]'
      : '';

    return (
      <div
        ref={ref}
        className={`bg-white/90 dark:bg-[#181915]/90 backdrop-blur-sm ${radiusClass} border border-black/[0.07] dark:border-white/[0.09] p-4 sm:p-5 ${shadowClass} ${interactiveClass} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
