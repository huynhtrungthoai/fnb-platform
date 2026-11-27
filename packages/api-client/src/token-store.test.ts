import { describe, expect, it } from 'vitest';

import { tokens } from './test/fake-api';
import { createStorageTokenStore } from './token-store';

import type { KeyValueStorage } from './token-store';

describe('createStorageTokenStore', () => {
  it('saves, reads back and clears the pair', () => {
    const store = createStorageTokenStore(window.localStorage, 'fnb.session');

    store.set(tokens('a'));
    expect(store.get()).toEqual(tokens('a'));

    store.clear();
    expect(store.get()).toBeNull();
    expect(window.localStorage.getItem('fnb.session')).toBeNull();
  });

  it('treats a corrupt or old-format value as signed out', () => {
    const store = createStorageTokenStore(window.localStorage, 'fnb.session');

    window.localStorage.setItem('fnb.session', '{not json');
    expect(store.get()).toBeNull();

    window.localStorage.setItem('fnb.session', JSON.stringify({ accessToken: 'x' }));
    expect(store.get()).toBeNull();
  });

  it('keeps the pair in memory when storage refuses to save it', () => {
    const refusing: KeyValueStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    const store = createStorageTokenStore(refusing, 'fnb.session');

    expect(store.get()).toBeNull();
    store.set(tokens('a'));
    expect(store.get()).toEqual(tokens('a'));
    store.clear();
    expect(store.get()).toBeNull();
  });
});
