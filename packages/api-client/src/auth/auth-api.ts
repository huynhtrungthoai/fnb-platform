import { authTokensSchema, meSchema } from '@fnb/contract';

import { isApiError } from '../api-error';
import { emptySchema } from '../http-client';

import type { HttpClient } from '../http-client';
import type { AuthTokens, ChangePassword, ChangePin, LoginInput, Me } from '@fnb/contract';

/** Calls of the `auth` module (CORE-12 → 15). Calls that return tokens store them. */
export interface AuthApi {
  /** Signs in with username and PIN, or password for the super admin. */
  login(input: LoginInput): Promise<AuthTokens>;
  /**
   * Ends this session on the server. The local tokens are cleared even when the server cannot be
   * reached, so signing out always works; the server session then lapses with its refresh token.
   */
  logout(): Promise<void>;
  /** Ends every session of the caller on every device. */
  logoutEverywhere(): Promise<void>;
  /** The caller and their permissions at each branch; `null` when signed out. */
  me(signal?: AbortSignal): Promise<Me | null>;
  changePin(input: ChangePin): Promise<AuthTokens>;
  changePassword(input: ChangePassword): Promise<AuthTokens>;
}

/** Binds the `auth` calls to an HTTP client. */
export function createAuthApi(http: HttpClient): AuthApi {
  const store = (tokens: AuthTokens): AuthTokens => {
    http.tokenStore.set(tokens);
    return tokens;
  };
  const endSession = async (path: string): Promise<void> => {
    if (!http.tokenStore.get()) {
      return;
    }
    try {
      await http.post(path, emptySchema, { branchId: null });
    } catch (error) {
      if (!isApiError(error)) {
        throw error;
      }
    } finally {
      http.tokenStore.clear();
    }
  };

  return {
    login: async (input) =>
      store(await http.post('/auth/login', authTokensSchema, { body: input, auth: false })),
    logout: () => endSession('/auth/logout'),
    logoutEverywhere: () => endSession('/auth/logout-all'),
    me: async (signal) => {
      if (!http.tokenStore.get()) {
        return null;
      }
      try {
        return await http.get('/auth/me', meSchema, {
          branchId: null,
          ...(signal ? { signal } : {}),
        });
      } catch (error) {
        // The session ended (refresh refused): that is "signed out", not a failure to show.
        if (
          isApiError(error) &&
          (error.code === 'TOKEN_EXPIRED' || error.code === 'UNAUTHENTICATED')
        ) {
          return null;
        }
        throw error;
      }
    },
    changePin: async (input) =>
      store(await http.post('/auth/change-pin', authTokensSchema, { body: input })),
    changePassword: async (input) =>
      store(await http.post('/auth/change-password', authTokensSchema, { body: input })),
  };
}
