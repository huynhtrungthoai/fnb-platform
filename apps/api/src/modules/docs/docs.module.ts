import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';

import { DocsController } from './docs.controller.js';

/** Serves the generated OpenAPI document at `/openapi.json`. */
@Module({ imports: [DiscoveryModule], controllers: [DocsController] })
export class DocsModule {}
