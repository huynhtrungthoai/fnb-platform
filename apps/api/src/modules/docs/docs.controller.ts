import { Controller, Get, Inject } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';

import { Public } from '../../common/decorators/public.decorator.js';
import { notFound } from '../../common/errors/app-error.js';
import { RawResponse } from '../../common/http/response.interceptor.js';
import { buildOpenApiDocument } from '../../common/openapi/openapi.js';
import { exploreRoutes } from '../../common/openapi/route-explorer.js';
import { ENV } from '../../config/env.js';

import type { Env } from '../../config/env.js';

@Controller()
export class DocsController {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly discovery: DiscoveryService,
  ) {}

  /** The OpenAPI document. Not served in production: it lists every route of the API. */
  @Public()
  @RawResponse()
  @Get('openapi.json')
  openApi(): Record<string, unknown> {
    if (this.env.NODE_ENV === 'production') {
      throw notFound('route');
    }
    return buildOpenApiDocument(exploreRoutes(this.discovery), {
      title: 'FNB Platform API',
      version: this.env.APP_VERSION,
    });
  }
}
