/** A random 6-digit temporary PIN (D-29), from the browser's secure random source. */
export function generateTempPin(): string {
  const [value = 0] = crypto.getRandomValues(new Uint32Array(1));
  return String(value % 1_000_000).padStart(6, '0');
}
