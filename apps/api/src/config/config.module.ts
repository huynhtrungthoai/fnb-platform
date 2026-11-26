import { Global, Module } from '@nestjs/common';

import { ENV, loadEnv } from './env.js';

/** Validates the environment once at startup and exposes it under the `ENV` token. */
@Global()
@Module({
  providers: [{ provide: ENV, useFactory: () => loadEnv() }],
  exports: [ENV],
})
export class ConfigModule {}
