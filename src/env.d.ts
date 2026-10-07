import type { SwipeCategory } from './scripts/swipe';

declare global {
  interface Window {
    /** Look data for the swipe browser, written by src/pages/swipe.astro. */
    __fitinspoSwipe?: SwipeCategory[];
  }
}

export {};
