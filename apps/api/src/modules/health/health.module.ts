import { Module } from '@nestjs/common';

import { DependencyProbe } from './dependency-probe.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

@Module({
  controllers: [HealthController],
  providers: [HealthService, DependencyProbe],
})
export class HealthModule {}
