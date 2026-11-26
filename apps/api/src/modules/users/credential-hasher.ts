import { Inject, Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

import { ENV } from '../../config/env.js';

import type { Env } from '../../config/env.js';

/** Argon2id parameters (OWASP baseline: 19 MiB, 2 passes). Tests use the minimum to stay fast. */
const PRODUCTION_COST = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };
const TEST_COST = { memoryCost: 1024, timeCost: 1, parallelism: 1 };

/** Hashes and checks PINs and passwords with Argon2id (D-29). Each hash has its own salt. */
@Injectable()
export class CredentialHasher {
  private readonly cost: typeof PRODUCTION_COST;

  constructor(@Inject(ENV) env: Env) {
    this.cost = env.NODE_ENV === 'test' ? TEST_COST : PRODUCTION_COST;
  }

  /** Argon2id is the library default; its const enum cannot be imported under isolatedModules. */
  hash(secret: string): Promise<string> {
    return hash(secret, this.cost);
  }

  /** True when the secret matches. A missing or malformed hash never matches. */
  async verify(storedHash: string | null | undefined, secret: string): Promise<boolean> {
    if (!storedHash) {
      return false;
    }
    try {
      return await verify(storedHash, secret);
    } catch {
      return false;
    }
  }
}
