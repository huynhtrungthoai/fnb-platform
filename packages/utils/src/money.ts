/**
 * Money helpers. All amounts are integer VND (D-09); there is no fractional unit.
 * Display formatting lives in `@fnb/i18n` (`formatMoney`), pricing rules in `@fnb/pos-core`.
 */

/** True when the value is a safe integer, the only valid shape of a VND amount. */
export function isVndAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

/** Throws when the value is not an integer VND amount. A missing price must never become 0. */
export function assertVndAmount(value: unknown, label = 'amount'): asserts value is number {
  if (!isVndAmount(value)) {
    throw new RangeError(`${label} must be an integer VND amount, received ${String(value)}`);
  }
}

/** Adds integer VND amounts. An empty list sums to 0. */
export function sumVnd(amounts: readonly number[]): number {
  let total = 0;
  for (const amount of amounts) {
    assertVndAmount(amount);
    total += amount;
  }
  assertVndAmount(total, 'total');
  return total;
}

/** Multiplies a unit price by a whole quantity. */
export function multiplyVnd(unitPrice: number, quantity: number): number {
  assertVndAmount(unitPrice, 'unitPrice');
  if (!Number.isSafeInteger(quantity)) {
    throw new RangeError(`quantity must be an integer, received ${String(quantity)}`);
  }
  const total = unitPrice * quantity;
  assertVndAmount(total, 'total');
  return total;
}

/**
 * Returns `percent` % of an amount, rounded half away from zero to a whole dong.
 * The percentage is taken to two decimal places (basis points) so 7.5 % is exact.
 */
export function percentOfVnd(amount: number, percent: number): number {
  assertVndAmount(amount);
  if (!Number.isFinite(percent)) {
    throw new RangeError(`percent must be a finite number, received ${String(percent)}`);
  }
  const basisPoints = Math.round(percent * 100);
  const raw = (Math.abs(amount) * basisPoints) / 10_000;
  const rounded = Math.round(raw);
  return amount < 0 ? -rounded : rounded;
}

/** Rounds an amount to the nearest multiple of `step` (for example 1000 for cash rounding). */
export function roundVndToStep(amount: number, step: number): number {
  assertVndAmount(amount);
  if (!Number.isSafeInteger(step) || step <= 0) {
    throw new RangeError(`step must be a positive integer, received ${String(step)}`);
  }
  const rounded = Math.round(Math.abs(amount) / step) * step;
  return amount < 0 ? -rounded : rounded;
}
