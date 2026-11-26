import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';

import { standardColumns } from '../../db/columns.js';

import type { MediaPurpose } from '@fnb/contract';

/**
 * Uploaded images (CORE-42). The file lives in S3-compatible storage; this row keeps where and
 * what. `branch_id` is set for branch documents and null for business-wide images (menu, staff).
 */
export const media = pgTable('media', {
  ...standardColumns(),
  branchId: uuid('branch_id'),
  purpose: text('purpose').$type<MediaPurpose>().notNull(),
  storageKey: text('storage_key').notNull(),
  thumbKey: text('thumb_key').notNull(),
  contentType: text('content_type').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  /** Size of the upload before compression, to see how much was saved. */
  originalBytes: integer('original_bytes').notNull(),
});
