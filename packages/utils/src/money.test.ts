import { describe, expect, it } from 'vitest';

import {
  assertVndAmount,
  isVndAmount,
  multiplyVnd,
  percentOfVnd,
  roundVndToStep,
  sumVnd,
} from './money.js';

describe('isVndAmount / assertVndAmount', () => {
  it('accepts integers, including zero and negatives', () => {
    expect(isVndAmount(0)).toBe(true);
    expect(isVndAmount(120_000)).toBe(true);
    expect(isVndAmount(-45_000)).toBe(true);
  });

  it('rejects fractions, NaN, strings and missing values', () => {
    expect(isVndAmount(1.5)).toBe(false);
    expect(isVndAmount(Number.NaN)).toBe(false);
    expect(isVndAmount('1000')).toBe(false);
    expect(isVndAmount(undefined)).toBe(false);
    expect(isVndAmount(null)).toBe(false);
  });

  it('throws with the field name instead of silently using 0', () => {
    expect(() => {
      assertVndAmount(undefined, 'price');
    }).toThrow(/price must be an integer VND amount/);
  });
});

describe('sumVnd', () => {
  it('adds amounts and returns 0 for an empty list', () => {
    expect(sumVnd([])).toBe(0);
    expect(sumVnd([35_000, 45_000, -5_000])).toBe(75_000);
  });

  it('refuses a fractional amount', () => {
    expect(() => sumVnd([1000, 0.5])).toThrow(RangeError);
  });
});

describe('multiplyVnd', () => {
  it('multiplies a unit price by a whole quantity', () => {
    expect(multiplyVnd(35_000, 3)).toBe(105_000);
    expect(multiplyVnd(35_000, 0)).toBe(0);
  });

  it('refuses a fractional quantity', () => {
    expect(() => multiplyVnd(35_000, 1.5)).toThrow(RangeError);
  });
});

describe('percentOfVnd', () => {
  it('returns a whole-dong result', () => {
    expect(percentOfVnd(120_000, 10)).toBe(12_000);
    expect(percentOfVnd(99_999, 8)).toBe(8_000);
    expect(percentOfVnd(35_000, 7.5)).toBe(2_625);
  });

  it('rounds half away from zero, symmetrically for refunds', () => {
    expect(percentOfVnd(50, 1)).toBe(1);
    expect(percentOfVnd(-50, 1)).toBe(-1);
  });

  it('handles 0 % and 100 %', () => {
    expect(percentOfVnd(120_000, 0)).toBe(0);
    expect(percentOfVnd(120_000, 100)).toBe(120_000);
  });
});

describe('roundVndToStep', () => {
  it('rounds to the nearest step', () => {
    expect(roundVndToStep(12_499, 1000)).toBe(12_000);
    expect(roundVndToStep(12_500, 1000)).toBe(13_000);
    expect(roundVndToStep(-12_500, 1000)).toBe(-13_000);
  });

  it('refuses a non-positive step', () => {
    expect(() => roundVndToStep(1000, 0)).toThrow(RangeError);
  });
});
