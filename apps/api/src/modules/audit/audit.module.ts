import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AuditController } from './audit.controller.js';
import { AuditService } from './audit.service.js';
import { AuditedInterceptor } from './audited.interceptor.js';

/** Audit log: `AuditService` for every module, `@Audited` on endpoints, and the search API. */
@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService, { provide: APP_INTERCEPTOR, useClass: AuditedInterceptor }],
  exports: [AuditService],
})
export class AuditModule {}
