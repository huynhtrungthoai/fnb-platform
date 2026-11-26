import { Controller, Get } from '@nestjs/common';

import { Public } from '../../common/decorators/public.decorator.js';
import { RawResponse } from '../../common/http/response.interceptor.js';
import { HealthService } from './health.service.js';

import type { HealthResponse } from '@fnb/contract';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /** Always answers 200 while the process is up; a dependency that is down shows as `degraded`. */
  @Public()
  @RawResponse()
  @Get()
  check(): Promise<HealthResponse> {
    return this.healthService.check();
  }
}
