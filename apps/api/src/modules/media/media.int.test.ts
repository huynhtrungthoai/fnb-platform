import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { apiErrorSchema, apiSuccessSchema, mediaSchema } from '@fnb/contract';

import { createBranch, signInAs } from '../../test/auth-helpers.js';
import { createTestApp } from '../../test/test-app.js';
import { MemoryObjectStorage, OBJECT_STORAGE } from './object-storage.js';

import type { TestSession } from '../../test/auth-helpers.js';
import type { TestApp } from '../../test/test-app.js';

let test: TestApp;
let manager: TestSession;
let branch1: string;
const storage = new MemoryObjectStorage();

beforeAll(async () => {
  test = await createTestApp({
    customize: (builder) => builder.overrideProvider(OBJECT_STORAGE).useValue(storage),
  });
});

beforeEach(async () => {
  await test.reset();
  storage.files.clear();
  branch1 = await createBranch(test, 'Q1');
  manager = await signInAs(test, 'manager', branch1);
});

afterAll(async () => {
  await test.close();
});

const mediaBody = apiSuccessSchema(mediaSchema);
const errorOf = (body: unknown) => apiErrorSchema.parse(body).error;

const photo = (width: number, height: number): Promise<Buffer> =>
  sharp({ create: { width, height, channels: 3, background: { r: 200, g: 40, b: 20 } } })
    .jpeg()
    .toBuffer();

describe('POST /media', () => {
  it('stores a compressed WebP no larger than 1600 px and a 320 px thumbnail', async () => {
    const response = await test.http
      .post('/media')
      .query({ purpose: 'user_avatar' })
      .set(manager.headers())
      .set('content-type', 'image/jpeg')
      .send(await photo(3200, 1600))
      .expect(201);
    const media = mediaBody.parse(response.body).data;
    expect(media).toMatchObject({ contentType: 'image/webp', width: 1600, height: 800 });
    expect(storage.files.size).toBe(2);

    const thumb = await test.http.get(media.thumbUrl).expect(200);
    expect(thumb.headers['content-type']).toBe('image/webp');
    const meta = await sharp(thumb.body as Buffer).metadata();
    expect([meta.width, meta.height]).toEqual([320, 160]);
    // The file is public like a CDN link; the metadata needs a session.
    await test.http.get(`/media/${media.id}`).expect(401);
    await test.http.get(`/media/${media.id}`).set(manager.headers()).expect(200);

    // The image becomes the avatar of a staff member of the manager's branch.
    const staff = await signInAs(test, 'staff', branch1);
    const updated = await test.http
      .patch(`/users/${staff.userId}`)
      .set(manager.headers())
      .send({ avatarMediaId: media.id })
      .expect(200);
    expect(JSON.stringify(updated.body)).toContain(media.id);
    await test.http
      .patch(`/users/${staff.userId}`)
      .set(manager.headers())
      .send({ avatarMediaId: '01900000-0000-7000-8000-000000000000' })
      .expect(404);
  });

  it('refuses other file types, unreadable images and callers without the permission', async () => {
    const pdf = await test.http
      .post('/media')
      .query({ purpose: 'user_avatar' })
      .set(manager.headers())
      .set('content-type', 'application/pdf')
      .send('%PDF-1.4')
      .expect(415);
    expect(errorOf(pdf.body).code).toBe('MEDIA_UNSUPPORTED');
    await test.http
      .post('/media')
      .query({ purpose: 'user_avatar' })
      .set(manager.headers())
      .set('content-type', 'image/png')
      .send(Buffer.from('not an image'))
      .expect(415);
    const cashier = await signInAs(test, 'cashier', await createBranch(test, 'Q3'));
    await test.http
      .post('/media')
      .query({ purpose: 'user_avatar' })
      .set(cashier.headers())
      .set('content-type', 'image/jpeg')
      .send(await photo(10, 10))
      .expect(403);
  });

  it('refuses an upload over 10 MB', async () => {
    const response = await test.http
      .post('/media')
      .query({ purpose: 'user_avatar' })
      .set(manager.headers())
      .set('content-type', 'image/jpeg')
      .send(Buffer.alloc(10 * 1024 * 1024 + 10))
      .expect(413);
    expect(errorOf(response.body).code).toBe('MEDIA_TOO_LARGE');
  });
});
