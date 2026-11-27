import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom does not implement pointer capture, which the component set reads on pointer events.
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
  document.documentElement.removeAttribute('data-mode');
});
