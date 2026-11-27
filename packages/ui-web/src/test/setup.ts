import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom does not implement pointer capture, which Radix reads on pointer events.
Object.assign(Element.prototype, {
  hasPointerCapture: () => false,
  setPointerCapture: () => undefined,
  releasePointerCapture: () => undefined,
  // Radix Select scrolls the chosen option into view; jsdom has no layout.
  scrollIntoView: () => undefined,
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-mode');
});

// Radix measures some controls (a checkbox inside a form); jsdom has no layout to observe.
class NoopResizeObserver {
  observe = (): undefined => undefined;
  unobserve = (): undefined => undefined;
  disconnect = (): undefined => undefined;
}
globalThis.ResizeObserver ??= NoopResizeObserver;
