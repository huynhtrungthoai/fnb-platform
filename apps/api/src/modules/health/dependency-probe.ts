import { Socket } from 'node:net';

import { Injectable } from '@nestjs/common';

const DEFAULT_PORTS: Record<string, number> = {
  'postgres:': 5432,
  'postgresql:': 5432,
  'redis:': 6379,
  'rediss:': 6379,
  'http:': 80,
  'https:': 443,
};

const PROBE_TIMEOUT_MS = 1000;

/**
 * Checks that a backing service accepts TCP connections.
 * This is a reachability check only; real driver pings replace it when the database,
 * Redis and storage clients are added in M1.
 */
@Injectable()
export class DependencyProbe {
  isReachable(serviceUrl: string): Promise<boolean> {
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
}
