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
      this.statusOf(this.probe.database()),
      this.statusOf(this.probe.redis()),
      this.statusOf(this.probe.storage()),
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

  private async statusOf(check: Promise<boolean>): Promise<DependencyStatus> {
    return (await check) ? 'up' : 'down';
  }
}
