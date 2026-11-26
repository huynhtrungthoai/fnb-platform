import { Body, Controller, Get, Headers, Post, StreamableFile } from '@nestjs/common';

import { mediaContentQuerySchema, mediaSchema, uploadMediaQuerySchema } from '@fnb/contract';

import { Auth, Authenticated, Public } from '../../common/decorators/access.decorators.js';
import { RawResponse } from '../../common/http/response.interceptor.js';
import { UuidParam, ZQuery, ZResponse } from '../../common/zod/zod.decorators.js';
import { Audited } from '../audit/audited.interceptor.js';
import { MediaService } from './media.service.js';

import type { AuthContext } from '../../common/decorators/access.decorators.js';
import type { Media, MediaContentQuery, UploadMediaQuery } from '@fnb/contract';

/** Image upload (CORE-42). The body is the raw image; `Content-Type` says which kind. */
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  /** Needs the permission of the purpose (`user_avatar`: `user.manage`), checked in the service. */
  @Authenticated()
  @Audited('media.upload')
  @ZResponse(mediaSchema, { summary: 'Upload an image; stored as WebP with a thumbnail' })
  @Post()
  upload(
    @Auth() auth: AuthContext,
    @ZQuery(uploadMediaQuerySchema) query: UploadMediaQuery,
    @Headers('content-type') contentType: string | undefined,
    @Body() body: unknown,
  ): Promise<Media> {
    return this.media.upload(auth, query.purpose, contentType, body);
  }

  @Authenticated()
  @ZResponse(mediaSchema)
  @Get(':id')
  get(@UuidParam() id: string): Promise<Media> {
    return this.media.getById(id);
  }

  /**
   * The image itself. Public, like a CDN link: menu photos are shown to customers, and ids are
   * random UUIDs. Cached for a year because a stored image never changes.
   */
  @Public()
  @RawResponse()
  @Get(':id/content')
  async content(
    @UuidParam() id: string,
    @ZQuery(mediaContentQuerySchema) query: MediaContentQuery,
  ): Promise<StreamableFile> {
    const file = await this.media.content(id, query.variant);
    return new StreamableFile(file.body, {
      type: file.contentType,
      length: file.body.length,
      disposition: 'inline',
    });
  }
}
