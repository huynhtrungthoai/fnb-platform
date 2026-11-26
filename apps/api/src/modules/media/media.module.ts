import { RequestMethod, Module } from '@nestjs/common';
import { raw } from 'express';

import { MAX_UPLOAD_BYTES } from '@fnb/contract';

import { AppError } from '../../common/errors/app-error.js';
import { MediaController } from './media.controller.js';
import { MediaService } from './media.service.js';
import { OBJECT_STORAGE, S3ObjectStorage } from './object-storage.js';

import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import type { NextFunction } from 'express';
import type { IncomingMessage, ServerResponse } from 'node:http';

const readRawImage = raw({ type: 'image/*', limit: MAX_UPLOAD_BYTES });

/** Reads the raw image body; a body over the limit becomes `413 MEDIA_TOO_LARGE`. */
function rawImageBody(
  request: IncomingMessage,
  response: ServerResponse,
  next: NextFunction,
): void {
  // The request is the IncomingMessage Node created; the rule cannot see through the middleware type.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-class-instance-assignment
  readRawImage(request, response, (error?: unknown) => {
    if (error) {
      next(
        new AppError('MEDIA_TOO_LARGE', 'Upload too large', {
          params: { maxBytes: MAX_UPLOAD_BYTES },
          cause: error,
        }),
      );
      return;
    }
    next();
  });
}

/** Uploaded images in S3-compatible storage (CORE-42). */
@Module({
  controllers: [MediaController],
  providers: [MediaService, { provide: OBJECT_STORAGE, useClass: S3ObjectStorage }],
  exports: [MediaService],
})
export class MediaModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Uploads are raw image bytes; the global parser only reads JSON.
    consumer.apply(rawImageBody).forRoutes({ path: 'media', method: RequestMethod.POST });
  }
}
