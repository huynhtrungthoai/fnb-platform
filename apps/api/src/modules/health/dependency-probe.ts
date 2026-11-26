import { Socket } from 'node:net';

import { Inject, Injectable } from '@nestjs/common';

import { ENV } from '../../config/env.js';
import { PG_POOL } from '../../db/database.js';

import type { Env } from '../../config/env.js';
import type { Pool } from 'pg';

const DEFAULT_PORTS: Record<string, number> = {
  'redis:': 6379,
  'rediss:': 6379,
  'http:': 80,
  'https:': 443,
};

const PROBE_TIMEOUT_MS = 1000;

/** Resolves to `false` when the check has not answered in time, so `/health` never hangs. */
export function withTimeout(
  check: Promise<boolean>,
  timeoutMs = PROBE_TIMEOUT_MS,
): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(false);
    }, timeoutMs);
    check
      .then((isUp) => {
        resolve(isUp);
      })
      .catch(() => {
        resolve(false);
      })
      .finally(() => {
        clearTimeout(timer);
      });
  });
}

/** Checks that a service accepts TCP connections. Used until a real client exists for it. */
export function isTcpReachable(serviceUrl: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(serviceUrl);
  } catch {
    return Promise.resolve(false);
  }
  const port = url.port ? Number(url.port) : DEFAULT_PORTS[url.protocol];
  if (!port || !url.hostname) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const socket = new Socket();
    const finish = (isReachable: boolean): void => {
      socket.destroy();
      resolve(isReachable);
    };
    socket.setTimeout(PROBE_TIMEOUT_MS);
    socket.once('connect', () => {
      finish(true);
    });
    socket.once('timeout', () => {
      finish(false);
    });
    socket.once('error', () => {
      finish(false);
    });
    socket.connect(port, url.hostname);
  });
}

/**
 * Checks each backing service. The database answers a real query; Redis and storage are
 * TCP-probed until their clients are added (M1-04, M1-15).
 */
@Injectable()
export class DependencyProbe {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  database(): Promise<boolean> {
    return withTimeout(this.pool.query('select 1').then(() => true));
  }

  redis(): Promise<boolean> {
    return isTcpReachable(this.env.REDIS_URL);
  }

  storage(): Promise<boolean> {
    return isTcpReachable(this.env.S3_ENDPOINT);
  }
}
