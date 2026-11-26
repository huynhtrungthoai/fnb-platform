import { Module } from '@nestjs/common';

import { CommonModule } from './common/common.module.js';
import { RateLimitModule } from './common/rate-limit/rate-limit.module.js';
import { ConfigModule } from './config/config.module.js';
import { DatabaseModule } from './db/database.module.js';
import { DocsModule } from './modules/docs/docs.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { RbacModule } from './modules/rbac/rbac.module.js';
import { RedisModule } from './redis/redis.module.js';

@Module({
  imports: [
    ConfigModule,
    CommonModule,
    DatabaseModule,
    RedisModule,
    RateLimitModule,
    DocsModule,
    HealthModule,
    RbacModule,
  ],
})
export class AppModule {}
