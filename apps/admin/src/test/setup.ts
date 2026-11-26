import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom does not implement pointer capture, which the component set reads on pointer events.
Object.assign(Element.prototype, {
  hasPointerCapture: () => false,
  setPointerCapture: () => undefined,
  releasePointerCapture: () => undefined,
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-mode');
});
