import { authTokensSchema } from '@fnb/contract';

import type { AuthTokens } from '@fnb/contract';

/**
 * Where the client keeps the session tokens. Reads go through `get()` every time, so a store
 * shared between browser tabs always returns the newest pair another tab saved.
 */
export interface TokenStore {
  get(): AuthTokens | null;
  set(tokens: AuthTokens): void;
  clear(): void;
}

/** Keeps the tokens in memory only: they are gone on reload (tests, kiosk sessions). */
export function createMemoryTokenStore(initial: AuthTokens | null = null): TokenStore {
  let tokens = initial;
  return {
    get: () => tokens,
    set: (next) => {
      tokens = next;
    },
    clear: () => {
      tokens = null;
    },
  };
}

/** The part of the Web Storage API the store uses. */
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Keeps the tokens in Web Storage (`localStorage` in Admin). The stored value is parsed with
 * Zod on every read; a corrupt or old-format value counts as signed out. Storage that throws
 * (private mode, quota) never crashes the app: a pair it could not save is kept in memory.
 */
export function createStorageTokenStore(storage: KeyValueStorage, key: string): TokenStore {
  // Holds the pair only while storage refuses to save it.
  let unsaved: AuthTokens | null = null;
  return {
    get: () => {
      if (unsaved) {
        return unsaved;
      }
      try {
        const raw = storage.getItem(key);
        if (raw === null) {
          return null;
        }
        const parsed = authTokensSchema.safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data : null;
      } catch {
        return null;
      }
    },
    set: (tokens) => {
      try {
        storage.setItem(key, JSON.stringify(tokens));
        unsaved = null;
      } catch {
        // Not persisted: the session still works until reload.
        unsaved = tokens;
      }
    },
    clear: () => {
      unsaved = null;
      try {
        storage.removeItem(key);
      } catch {
        // Nothing stored to remove.
      }
    },
  };
}
