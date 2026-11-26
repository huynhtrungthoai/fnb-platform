/** Keys whose values never go into the audit log: PINs, passwords, hashes, tokens, secrets. */
const SECRET_KEY = /pin|password|secret|token|hash/i;

const REDACTED = '[redacted]';
const MAX_DEPTH = 6;

/**
 * Copies a value for the audit log with every secret replaced by a marker.
 * Nobody may read another person's PIN, not even from the log (plans/10-foundation.md).
 */
export function redactSecrets(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value !== 'object') {
    return value;
  }
  if (depth >= MAX_DEPTH) {
    return '[truncated]';
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item, depth + 1));
  }
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = SECRET_KEY.test(key) ? REDACTED : redactSecrets(item, depth + 1);
  }
  return result;
}
