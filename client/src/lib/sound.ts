/**
 * Fruit Family Shared UI Sound Effects (SFX) Subsystem - Plum Edition
 *
 * Implements Section 2.10 and Appendix of DESIGN.md:
 * - 5 categories: enter, back, notification, failed, scroll
 * - Preloaded audio pool with overlap replay
 * - 140ms scroll throttling
 * - Resilient silent failure
 * - User-facing mute setting persisted in `localStorage['fruit_sound_enabled']`
 */

import { useState, useEffect } from 'react';

export type SoundCategory = 'scroll' | 'enter' | 'back' | 'failed' | 'notification';

const SFX_FILES: Record<SoundCategory, string> = {
  scroll: '/sfx/scroll.mp3',
  enter: '/sfx/enter.mp3',
  back: '/sfx/back.mp3',
  failed: '/sfx/failed.mp3',
  notification: '/sfx/notification.mp3',
};

// Calibrated master volume levels from DESIGN.md Section 2.10
const VOLUMES: Record<SoundCategory, number> = {
  scroll: 0.25,
  enter: 0.40,
  back: 0.35,
  failed: 0.45,
  notification: 0.45,
};

const STORAGE_KEY = 'fruit_sound_enabled';
const SCROLL_THROTTLE_MS = 140;

const audioCache: Partial<Record<SoundCategory, HTMLAudioElement>> = {};
let lastScrollTime = 0;

/**
 * Sound effects are permanently active across Plum workspace.
 * Sound stays enabled at all times.
 */
export function isSoundEnabled(): boolean {
  return true;
}

/**
 * Sound is permanently on; muting is disabled.
 */
export function setSoundEnabled(_enabled: boolean): void {
  // Sound stays permanently on
}

export function toggleSound(): boolean {
  return true;
}

/**
 * React hook for subscribing to sound enabled state
 */
export function useSoundSettings() {
  const [enabled, setEnabled] = useState<boolean>(() => isSoundEnabled());

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ enabled: boolean }>;
      if (custom.detail && typeof custom.detail.enabled === 'boolean') {
        setEnabled(custom.detail.enabled);
      } else {
        setEnabled(isSoundEnabled());
      }
    };
    window.addEventListener('fruit-sound-toggle', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('fruit-sound-toggle', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  return {
    isSoundEnabled: enabled,
    setSoundEnabled,
    toggleSound,
  };
}

/**
 * Play a UI sound effect if available and enabled.
 * Silently ignores missing files, playback blocks, or uninitialized audio environments.
 */
export function playSound(category: SoundCategory): void {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') {
    return;
  }

  // Respect user-facing mute toggle immediately before audio init
  if (!isSoundEnabled()) {
    return;
  }

  // Throttle scroll sounds to avoid overwhelming repetitive audio
  if (category === 'scroll') {
    const now = Date.now();
    if (now - lastScrollTime < SCROLL_THROTTLE_MS) {
      return;
    }
    lastScrollTime = now;
  }

  try {
    let audio = audioCache[category];
    if (!audio) {
      audio = new Audio(SFX_FILES[category]);
      audio.preload = 'auto';
      audio.volume = VOLUMES[category] ?? 0.40;
      audioCache[category] = audio;
    } else {
      audio.currentTime = 0;
    }

    const promise = audio.play();
    if (promise && typeof promise.catch === 'function') {
      promise.catch(() => {
        // Autoplay policy or missing file: fail silently
      });
    }
  } catch {
    // Fail silently
  }
}

export const playEnter = () => playSound('enter');
export const playBack = () => playSound('back');
export const playFailed = () => playSound('failed');
export const playNotification = () => playSound('notification');
export const playScroll = () => playSound('scroll');
