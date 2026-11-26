import { Inject, Injectable } from '@nestjs/common';
import { errors, jwtVerify, SignJWT } from 'jose';

import { AppError } from '../../../common/errors/app-error.js';
import { ENV } from '../../../config/env.js';

import type { Env } from '../../../config/env.js';

/** What an access token says. It carries no permissions: those are read per request. */
export interface AccessTokenClaims {
  /** User id. */
  userId: string;
  /** Session id; the session must still be active for the token to be accepted. */
  sessionId: string;
  /** Device id of a POS staff session. */
  deviceId?: string;
  /** The user must change a temporary PIN before doing anything else. */
  mustChangePin?: boolean;
}

const ISSUER = 'fnb-api';
const ALGORITHM = 'HS256';

/** Signs and verifies short-lived access tokens (CORE-15). */
@Injectable()
export class AccessTokenService {
  private readonly key: Uint8Array;

  constructor(@Inject(ENV) private readonly env: Env) {
    this.key = new TextEncoder().encode(env.JWT_SECRET);
  }

  /** Lifetime of a new token in seconds. */
  get ttlSeconds(): number {
    return this.env.ACCESS_TOKEN_TTL_SECONDS;
  }

  sign(claims: AccessTokenClaims, ttlSeconds: number = this.ttlSeconds): Promise<string> {
    return new SignJWT({
      sid: claims.sessionId,
      ...(claims.deviceId ? { did: claims.deviceId } : {}),
      ...(claims.mustChangePin ? { mcp: true } : {}),
    })
      .setProtectedHeader({ alg: ALGORITHM })
      .setSubject(claims.userId)
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
      .sign(this.key);
  }

  /** Returns the claims, or throws `TOKEN_EXPIRED` / `UNAUTHENTICATED`. */
  async verify(token: string): Promise<AccessTokenClaims> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        algorithms: [ALGORITHM],
        issuer: ISSUER,
      });
      const { sub, sid, did, mcp } = payload;
      if (typeof sub !== 'string' || typeof sid !== 'string') {
        throw new AppError('UNAUTHENTICATED', 'Access token has no subject or session');
      }
      return {
        userId: sub,
        sessionId: sid,
        ...(typeof did === 'string' ? { deviceId: did } : {}),
        ...(mcp === true ? { mustChangePin: true } : {}),
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof errors.JWTExpired) {
        throw new AppError('TOKEN_EXPIRED', 'Access token expired');
      }
      throw new AppError('UNAUTHENTICATED', 'Access token is not valid', { cause: error });
    }
  }
}
