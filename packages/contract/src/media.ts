import { z } from 'zod';

/**
 * What an image is for. Each purpose has its own upload permission (CORE-42); later milestones
 * add theirs (product photos in M2, cash documents in M3).
 */
export const mediaPurposeSchema = z.enum(['user_avatar']);

/** What an image is for. */
export type MediaPurpose = z.infer<typeof mediaPurposeSchema>;

/** Largest upload, in bytes. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Image types accepted by `POST /media`. */
export const UPLOAD_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Query of `POST /media`; the body is the raw image with its `Content-Type`. */
export const uploadMediaQuerySchema = z.object({ purpose: mediaPurposeSchema });

/** Query of `POST /media`. */
export type UploadMediaQuery = z.infer<typeof uploadMediaQuerySchema>;

/** A stored image: a compressed WebP and its thumbnail. */
export const mediaSchema = z.object({
  id: z.uuid(),
  purpose: mediaPurposeSchema,
  contentType: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  sizeBytes: z.number().int(),
  /** Path of the full image, relative to the API (`/media/:id/content`). */
  url: z.string(),
  /** Path of the thumbnail (`/media/:id/content?variant=thumb`). */
  thumbUrl: z.string(),
  createdAt: z.iso.datetime(),
});

/** A stored image. */
export type Media = z.infer<typeof mediaSchema>;

/** Query of `GET /media/:id/content`. */
export const mediaContentQuerySchema = z.object({
  variant: z.enum(['full', 'thumb']).default('full'),
});

/** Query of `GET /media/:id/content`. */
export type MediaContentQuery = z.infer<typeof mediaContentQuerySchema>;
