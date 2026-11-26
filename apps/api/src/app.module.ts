import { Module } from '@nestjs/common';

import { CommonModule } from './common/common.module.js';
import { RateLimitModule } from './common/rate-limit/rate-limit.module.js';
import { ConfigModule } from './config/config.module.js';
import { DatabaseModule } from './db/database.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { BranchesModule } from './modules/branches/branches.module.js';
import { DocsModule } from './modules/docs/docs.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { RbacModule } from './modules/rbac/rbac.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { RedisModule } from './redis/redis.module.js';

@Module({
  imports: [
    ConfigModule,
    CommonModule,
    DatabaseModule,
    RedisModule,
    RateLimitModule,
    AuthModule,
    AuditModule,
    BranchesModule,
    DocsModule,
    HealthModule,
    MediaModule,
    RbacModule,
    UsersModule,
  ],
})
export class AppModule {}
