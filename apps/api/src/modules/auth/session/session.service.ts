import { createHash, randomBytes } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import { uuidv7 } from '@fnb/utils';

import { AppError } from '../../../common/errors/app-error.js';
import { ENV } from '../../../config/env.js';
import { AccessTokenService } from './access-token.service.js';
import { RefreshTokenRepository } from './refresh-token.repository.js';
import { SessionStore } from './session-store.js';

import type { Env } from '../../../config/env.js';
import type { RefreshTokenRow } from './refresh-token.repository.js';
import type { AuthTokens } from '@fnb/contract';

/** SHA-256 of a refresh token: what the database keeps. */
export const hashRefreshToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

/** Longest life of a staff session on a POS device without a refresh: 12 hours. */
export const DEVICE_SESSION_TTL_SECONDS = 12 * 3600;

/** What a session is for. */
export interface SessionSubject {
  userId: string;
  deviceId?: string;
  mustChangePin: boolean;
}

/**
 * Sessions (CORE-15): a short access token plus a single-use refresh token that rotates on
 * every refresh. The session is active in Redis while its refresh token lives; ending it in
 * Redis cuts the access tokens already handed out, and revoking its rows stops refreshes.
 */
@Injectable()
export class SessionService {
  constructor(
    private readonly tokens: AccessTokenService,
    private readonly store: SessionStore,
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Opens a new session and returns its first tokens. */
  start(subject: SessionSubject, now: Date = new Date()): Promise<AuthTokens> {
    return this.issue(uuidv7(), subject, now);
  }

  /** Ends every staff session opened on a device: the device was revoked. */
  async endAllOfDevice(deviceId: string, now: Date = new Date()): Promise<void> {
    for (const session of await this.refreshTokens.activeSessionsOfDevice(deviceId)) {
      await this.end(session.sessionId, session.userId, now);
    }
  }

  /**
   * Exchanges a refresh token for new tokens. The caller checks the account first through
   * `peek`. A token used twice means it leaked: the whole session ends.
   */
  async rotate(
    row: RefreshTokenRow,
    subject: SessionSubject,
    now: Date = new Date(),
  ): Promise<AuthTokens> {
    if (!(await this.refreshTokens.markUsed(row.id, now))) {
      await this.end(row.sessionId, row.userId, now);
      throw new AppError('UNAUTHENTICATED', 'Refresh token reused; session ended');
    }
    return this.issue(row.sessionId, subject, now);
  }

  /**
   * Reads a refresh token that may still be exchanged. Throws `UNAUTHENTICATED` for an unknown,
   * expired, revoked or reused one (ending the session on reuse).
   */
  async peek(token: string, now: Date = new Date()): Promise<RefreshTokenRow> {
    const row = await this.refreshTokens.findByHash(hashRefreshToken(token));
    if (!row) {
      throw new AppError('UNAUTHENTICATED', 'Refresh token is not valid');
    }
    if (row.revokedAt !== null || row.expiresAt <= now) {
      throw new AppError('UNAUTHENTICATED', 'Refresh token has expired or was revoked');
    }
    if (row.usedAt !== null) {
      await this.end(row.sessionId, row.userId, now);
      throw new AppError('UNAUTHENTICATED', 'Refresh token reused; session ended');
    }
    if (!(await this.store.isActive(row.sessionId, row.userId))) {
      await this.refreshTokens.revokeSession(row.sessionId, now);
      throw new AppError('UNAUTHENTICATED', 'Session is no longer active');
    }
    return row;
  }

  /** Ends one session: logout. */
  async end(sessionId: string, userId: string, now: Date = new Date()): Promise<void> {
    await this.store.revoke(sessionId, userId);
    await this.refreshTokens.revokeSession(sessionId, now);
  }

  /** Ends every session of a user: disabled account, PIN reset, logout everywhere. */
  async endAllOfUser(userId: string, now: Date = new Date()): Promise<void> {
    await this.store.revokeAllOfUser(userId);
    await this.refreshTokens.revokeUser(userId, now);
  }

  private async issue(sessionId: string, subject: SessionSubject, now: Date): Promise<AuthTokens> {
    // A staff session on a device lasts about a shift; the device token itself is long-lived.
    const refreshTtl = subject.deviceId
      ? Math.min(DEVICE_SESSION_TTL_SECONDS, this.env.REFRESH_TOKEN_TTL_SECONDS)
      : this.env.REFRESH_TOKEN_TTL_SECONDS;
    const accessTtl = this.tokens.ttlSeconds;
    const refreshToken = randomBytes(32).toString('base64url');
    const refreshExpiresAt = new Date(now.getTime() + refreshTtl * 1000);
    await this.refreshTokens.insert({
      sessionId,
      userId: subject.userId,
      deviceId: subject.deviceId ?? null,
      tokenHash: hashRefreshToken(refreshToken),
      createdAt: now,
      expiresAt: refreshExpiresAt,
    });
    await this.store.activate(sessionId, subject.userId, refreshTtl);
    const accessToken = await this.tokens.sign({ sessionId, ...subject }, accessTtl);
    return {
      accessToken,
      accessTokenExpiresAt: new Date(now.getTime() + accessTtl * 1000).toISOString(),
      refreshToken,
      refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
      mustChangePin: subject.mustChangePin,
    };
  }
}
