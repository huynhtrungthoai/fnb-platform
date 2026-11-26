import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { AllExceptionsFilter } from './errors/all-exceptions.filter.js';
import { ResponseInterceptor } from './http/response.interceptor.js';

/** Cross-cutting pieces every endpoint gets: the response envelope and the error format. */
@Module({
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class CommonModule {}
