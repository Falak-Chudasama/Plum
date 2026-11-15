import React, { useEffect, useRef, useState, type ReactElement } from 'react';
import { useLocation, type Location } from 'react-router-dom';

/**
 * Route order matching the visual primary navigation bar sequence:
 * Inbox (0) -> Sent (1) -> Drafts (2) -> AI Chat (3) -> Accounts (4)
 */
const ROUTE_ORDER: Record<string, number> = {
  '/inbox': 0,
  '/sent': 1,
  '/drafts': 2,
  '/chat': 3,
  '/accounts': 4,
};

interface DirectionalPageTransitionProps {
  children: ReactElement;
}

/**
 * DirectionalPageTransition - Section 2.9 Fruit Family Motion Specification
 * Apple-grade two-layer directional slide transitions between tabs:
 * - Navigating rightward (e.g. Inbox -> Sent): previous page slides out to the left (-60px),
 *   while the new page slides in from the right (+60px) and settles.
 * - Navigating leftward (e.g. Sent -> Inbox): previous page slides out to the right (+60px),
 *   while the new page slides in from the left (-60px) and settles.
 * - Non-tab views (or initial render) enter smoothly with animate-page-enter.
 * - Respects prefers-reduced-motion via CSS overrides.
 */
export function DirectionalPageTransition({ children }: DirectionalPageTransitionProps) {
  const location = useLocation();
  const [currentLocation, setCurrentLocation] = useState<Location>(location);
  const [leavingLocation, setLeavingLocation] = useState<Location | null>(null);
  const [direction, setDirection] = useState<'right' | 'left' | 'fade'>('fade');

  const prevLocationRef = useRef<Location>(location);
  const fallbackTimerRef = useRef<number | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    isInitialMount.current = false;
  }, []);

  useEffect(() => {
    if (location.pathname !== prevLocationRef.current.pathname) {
      const prevIdx = ROUTE_ORDER[prevLocationRef.current.pathname];
      const currIdx = ROUTE_ORDER[location.pathname];

      let dir: 'right' | 'left' | 'fade' = 'fade';
      if (prevIdx !== undefined && currIdx !== undefined) {
        if (currIdx > prevIdx) {
          dir = 'right';
        } else if (currIdx < prevIdx) {
          dir = 'left';
        }
      }

      setLeavingLocation(prevLocationRef.current);
      setCurrentLocation(location);
      setDirection(dir);
      prevLocationRef.current = location;

      // Safety fallback timer if onAnimationEnd doesn't fire
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
      }
      fallbackTimerRef.current = window.setTimeout(() => {
        setLeavingLocation(null);
        fallbackTimerRef.current = null;
      }, 300);
    }
  }, [location]);

  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
      }
    };
  }, []);

  const handleAnimationEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
    // Only respond to animationend on the entering page container itself
    if (e.target === e.currentTarget) {
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      setLeavingLocation(null);
    }
  };

  const isMovingRight = direction === 'right';
  const isMovingLeft = direction === 'left';

  const leavingAnimClass = isMovingRight
    ? 'animate-slide-out-to-left'
    : isMovingLeft
    ? 'animate-slide-out-to-right'
    : 'animate-fade-in opacity-0';

  const enteringAnimClass = leavingLocation
    ? isMovingRight
      ? 'animate-slide-in-from-right'
      : isMovingLeft
      ? 'animate-slide-in-from-left'
      : 'animate-fade-in'
    : isInitialMount.current
    ? 'animate-page-enter'
    : '';

  return (
    <div className="relative w-full overflow-hidden">
      {/* Leaving page layer (slides out in opposite direction, unmounts on settle) */}
      {leavingLocation && (
        <div
          key={`leaving-${leavingLocation.pathname}`}
          className={`absolute inset-x-0 top-0 w-full z-0 pointer-events-none ${leavingAnimClass}`}
          aria-hidden="true"
        >
          {React.cloneElement(children, { location: leavingLocation })}
        </div>
      )}

      {/* Entering / Active page layer (STABLE key: never remounts or stutters when settling) */}
      <div
        key={`active-${currentLocation.pathname}`}
        onAnimationEnd={handleAnimationEnd}
        className={`relative w-full z-10 ${enteringAnimClass}`}
      >
        {React.cloneElement(children, { location: currentLocation })}
      </div>
    </div>
  );
}
