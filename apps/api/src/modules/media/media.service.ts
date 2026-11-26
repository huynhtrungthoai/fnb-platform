import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { MAX_UPLOAD_BYTES, UPLOAD_CONTENT_TYPES } from '@fnb/contract';
import { uuidv7 } from '@fnb/utils';

import { AppError, notFound } from '../../common/errors/app-error.js';
import { DB } from '../../db/database.js';
import { AuditService } from '../audit/audit.service.js';
import { branchReach, reachesAnyBranch } from '../rbac/access.js';
import { permissionDenied } from '../rbac/rbac.service.js';
import { processImage } from './image-processing.js';
import { OBJECT_STORAGE } from './object-storage.js';
import { media } from './schema.js';

import type { AuthContext } from '../../common/decorators/access.decorators.js';
import type { Database } from '../../db/database.js';
import type { ObjectStorage } from './object-storage.js';
import type { Media, MediaPurpose, PermissionCode } from '@fnb/contract';

/** Permission needed to upload an image for each purpose. */
export const UPLOAD_PERMISSION: Record<MediaPurpose, PermissionCode> = {
  user_avatar: 'user.manage',
};

type MediaRow = typeof media.$inferSelect;

const WEBP = 'image/webp';

function toMedia(row: MediaRow): Media {
  return {
    id: row.id,
    purpose: row.purpose,
    contentType: row.contentType,
    width: row.width,
    height: row.height,
    sizeBytes: row.sizeBytes,
    url: `/media/${row.id}/content`,
    thumbUrl: `/media/${row.id}/content?variant=thumb`,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Image upload to S3-compatible storage with compression and a thumbnail (CORE-42). */
@Injectable()
export class MediaService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    private readonly audit: AuditService,
  ) {}

  async upload(
    caller: AuthContext,
    purpose: MediaPurpose,
    contentType: string | undefined,
    body: unknown,
  ): Promise<Media> {
    const permission = UPLOAD_PERMISSION[purpose];
    if (!reachesAnyBranch(branchReach(caller.access, permission))) {
      throw permissionDenied(permission);
    }
    const type = (contentType ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
    if (!UPLOAD_CONTENT_TYPES.some((allowed) => allowed === type) || !Buffer.isBuffer(body)) {
      throw new AppError('MEDIA_UNSUPPORTED', `Unsupported upload type ${type}`);
    }
    if (body.length > MAX_UPLOAD_BYTES) {
      throw new AppError('MEDIA_TOO_LARGE', 'Upload too large', {
        params: { maxBytes: MAX_UPLOAD_BYTES },
      });
    }
    const image = await processImage(body);
    if (!image) {
      throw new AppError('MEDIA_UNSUPPORTED', 'Not a readable image');
    }
    const id = uuidv7();
    const storageKey = `media/${id}.webp`;
    const thumbKey = `media/${id}-thumb.webp`;
    await this.storage.put(storageKey, image.full.data, WEBP);
    await this.storage.put(thumbKey, image.thumb.data, WEBP);
    const [row] = await this.db
      .insert(media)
      .values({
        id,
        purpose,
        storageKey,
        thumbKey,
        contentType: WEBP,
        width: image.full.width,
        height: image.full.height,
        sizeBytes: image.full.data.length,
        originalBytes: body.length,
        createdBy: caller.userId,
        branchId: null,
      })
      .returning();
    if (!row) {
      throw new Error('Media insert returned no row');
    }
    const result = toMedia(row);
    this.audit.describe({ entityType: 'media', entityId: id, after: result, branchId: null });
    return result;
  }

  async getById(id: string): Promise<Media> {
    return toMedia(await this.requireRow(id));
  }

  /** True when the image exists and was uploaded for this purpose. */
  async isOfPurpose(id: string, purpose: MediaPurpose): Promise<boolean> {
    const [row] = await this.db.select().from(media).where(eq(media.id, id));
    return row?.purpose === purpose;
  }

  /** The bytes of an image or its thumbnail. */
  async content(
    id: string,
    variant: 'full' | 'thumb',
  ): Promise<{ body: Buffer; contentType: string }> {
    const row = await this.requireRow(id);
    const body = await this.storage.get(variant === 'thumb' ? row.thumbKey : row.storageKey);
    if (!body) {
      throw notFound('media_file', id);
    }
    return { body, contentType: row.contentType };
  }

  private async requireRow(id: string): Promise<MediaRow> {
    const [row] = await this.db.select().from(media).where(eq(media.id, id));
    if (!row) {
      throw notFound('media', id);
    }
    return row;
  }
}
