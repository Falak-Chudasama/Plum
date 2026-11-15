import { useRef, useEffect, useState, type ReactNode } from 'react';
import { playScroll } from '../../lib/sound';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
  icon?: ReactNode;
  colorDot?: string;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  const updateIndicator = () => {
    if (!containerRef.current) return;
    const activeIndex = options.findIndex((opt) => opt.value === value);
    if (activeIndex === -1) return;

    const buttons = containerRef.current.querySelectorAll<HTMLButtonElement>('button[data-segment]');
    const activeButton = buttons[activeIndex];
    if (activeButton) {
      setIndicatorStyle({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
      });
    }
  };

  useEffect(() => {
    updateIndicator();
  }, [value, options]);

  useEffect(() => {
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [value]);

  const handleSelect = (newVal: T) => {
    if (newVal === value) return;
    playScroll();
    onChange(newVal);
  };

  const padClass = size === 'sm' ? 'p-1' : 'p-1.5';
  const itemPadClass = size === 'sm' ? 'py-1 px-3 text-xs' : 'py-1.5 px-4 text-xs sm:text-sm';

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label="Navigation Segments"
      className={`glass-capsule relative flex items-center gap-1 rounded-full ${padClass} ${className}`}
    >
      {/* 300ms Apple-like Gliding Active Indicator Pill */}
      {indicatorStyle.width > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1 bottom-1 rounded-full bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
          }}
        />
      )}

      {options.map((opt) => {
        const isSelected = opt.value === value;

        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            data-segment="true"
            aria-selected={isSelected}
            onClick={() => handleSelect(opt.value)}
            className={`focus-ring relative z-10 flex min-h-[36px] sm:min-h-[40px] items-center justify-center gap-2 rounded-full font-semibold transition-colors duration-200 select-none ${itemPadClass} ${
              isSelected
                ? 'text-white dark:text-stone-900'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            {opt.colorDot && (
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: opt.colorDot }}
              />
            )}
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
            {typeof opt.count === 'number' && (
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isSelected
                    ? 'bg-white/20 text-white dark:bg-stone-900/15 dark:text-stone-900'
                    : 'bg-black/[0.06] dark:bg-white/[0.08] text-stone-600 dark:text-stone-400'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
