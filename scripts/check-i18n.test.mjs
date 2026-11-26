import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  checkErrorCodes,
  checkLocales,
  compareNamespace,
  extractErrorCodes,
  extractParameters,
  flattenKeys,
} from './check-i18n.mjs';

describe('flattenKeys', () => {
  it('flattens nested objects into dotted keys', () => {
    const flat = flattenKeys({ actions: { save: 'Lưu', cancel: 'Huỷ' }, title: 'Đơn' });
    assert.deepEqual([...flat.keys()], ['actions.save', 'actions.cancel', 'title']);
  });
});

describe('extractParameters', () => {
  it('finds interpolation names, ignoring formatting options', () => {
    assert.deepEqual(extractParameters('Còn {{count}} món, tổng {{total, number}}'), [
      'count',
      'total',
    ]);
    assert.deepEqual(extractParameters('Không có tham số'), []);
  });
});

describe('compareNamespace', () => {
  it('passes when keys and parameters match', () => {
    assert.deepEqual(
      compareNamespace('orders', { title: 'Đơn {{number}}' }, { title: 'Order {{number}}' }),
      [],
    );
  });

  it('reports a key missing on either side', () => {
    const problems = compareNamespace('orders', { a: 'A', b: 'B' }, { a: 'A', c: 'C' });
    assert.equal(problems.length, 2);
    assert.match(problems[0] ?? '', /en\/orders: missing key "b"/);
    assert.match(problems[1] ?? '', /vi\/orders: missing key "c"/);
  });

  it('reports empty and non-string values', () => {
    const problems = compareNamespace('orders', { a: '  ', b: 'B' }, { a: 'A', b: 3 });
    assert.ok(problems.some((problem) => problem.includes('vi/orders: "a" is empty')));
    assert.ok(problems.some((problem) => problem.includes('en/orders: "b" must be a string')));
  });

  it('reports parameters that differ between languages', () => {
    const problems = compareNamespace(
      'orders',
      { a: 'Có {{count}} món' },
      { a: '{{total}} items' },
    );
    assert.equal(problems.length, 1);
    assert.match(problems[0] ?? '', /different parameters/);
  });

  it('lets Vietnamese use only _other while English has _one and _other', () => {
    assert.deepEqual(
      compareNamespace(
        'orders',
        { items_other: '{{count}} món' },
        { items_one: '{{count}} item', items_other: '{{count}} items' },
      ),
      [],
    );
  });
});

describe('checkLocales', () => {
  it('passes on the real locale files of the repo', () => {
    const i18nRoot = resolve(fileURLToPath(import.meta.url), '../../packages/i18n');
    assert.deepEqual(checkLocales(i18nRoot), []);
  });

  it('reports a folder without locale files', () => {
    const problems = checkLocales(resolve(fileURLToPath(import.meta.url), '../does-not-exist'));
    assert.ok(problems.some((problem) => problem.includes('no locale files found')));
  });
});

describe('error codes', () => {
  it('reads the codes from the contract source', () => {
    const source =
      "export const ERROR_CODES = [\n  'NOT_FOUND',\n  'ORDER_ALREADY_PAID',\n] as const;";
    assert.deepEqual(extractErrorCodes(source), ['NOT_FOUND', 'ORDER_ALREADY_PAID']);
  });

  it('reports a code without a translation in either language', () => {
    const problems = checkErrorCodes(['NOT_FOUND', 'CONFLICT'], {
      vi: { NOT_FOUND: 'Không tìm thấy', CONFLICT: 'Trùng' },
      en: { NOT_FOUND: 'Not found' },
    });
    assert.deepEqual(problems, ['en/errors: missing translation of error code "CONFLICT"']);
  });
});
