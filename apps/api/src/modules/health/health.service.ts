import { Inject, Injectable } from '@nestjs/common';

import { ENV } from '../../config/env.js';
import { DependencyProbe } from './dependency-probe.js';

import type { Env } from '../../config/env.js';
import type { DependencyStatus, HealthResponse } from '@fnb/contract';

@Injectable()
export class HealthService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly probe: DependencyProbe,
  ) {}

  async check(): Promise<HealthResponse> {
    const [database, redis, storage] = await Promise.all([
      this.statusOf(this.env.DATABASE_URL),
      this.statusOf(this.env.REDIS_URL),
      this.statusOf(this.env.S3_ENDPOINT),
    ]);
    const isAllUp = database === 'up' && redis === 'up' && storage === 'up';

    return {
      status: isAllUp ? 'ok' : 'degraded',
      version: this.env.APP_VERSION,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      dependencies: { database, redis, storage },
    };
  }

  private async statusOf(serviceUrl: string): Promise<DependencyStatus> {
    return (await this.probe.isReachable(serviceUrl)) ? 'up' : 'down';
  }
}
