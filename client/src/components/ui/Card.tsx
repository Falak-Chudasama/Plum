import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
  elevation?: 'soft' | 'floating' | 'lift';
  radius?: '2xl' | '3xl';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      interactive = false,
      elevation = 'soft',
      radius = '2xl',
      className = '',
      ...props
    },
    ref
  ) => {
    const shadowClass = {
      soft: 'shadow-soft',
      floating: 'shadow-floating',
      lift: 'shadow-lift',
    }[elevation];

    const radiusClass = radius === '3xl' ? 'rounded-3xl' : 'rounded-2xl';

    const interactiveClass = interactive
      ? 'cursor-pointer transition-[transform,box-shadow,border-color] duration-180 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[1px] hover:shadow-lift hover:border-stone-300 dark:hover:border-stone-700 active:translate-y-[0.5px] active:scale-[0.99]'
      : '';

    return (
      <div
        ref={ref}
        className={`glass-card ${radiusClass} border border-black/[0.06] dark:border-white/[0.08] p-5 sm:p-6 ${shadowClass} ${interactiveClass} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
