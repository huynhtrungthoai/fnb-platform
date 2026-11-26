const POSTGRES_UNIQUE_VIOLATION = '23505';

/** True when a query failed on a unique constraint; drizzle wraps the driver error in `cause`. */
export function isUniqueViolation(error: unknown): boolean {
  const candidates = [error, error instanceof Error ? error.cause : undefined];
  return candidates.some(
    (candidate) =>
      typeof candidate === 'object' &&
      candidate !== null &&
      'code' in candidate &&
      candidate.code === POSTGRES_UNIQUE_VIOLATION,
  );
}
