import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { RequestContextMiddleware } from './context/request-context.middleware.js';
import { AllExceptionsFilter } from './errors/all-exceptions.filter.js';
import { ResponseInterceptor } from './http/response.interceptor.js';

import type { MiddlewareConsumer, NestModule } from '@nestjs/common';

/**
 * Cross-cutting pieces every endpoint gets: request id and access log, the response envelope
 * and the error format.
 */
@Module({
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('{*path}');
  }
}
