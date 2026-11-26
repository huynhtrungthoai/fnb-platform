import { Readable } from 'node:stream';

import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { ENV } from '../../config/env.js';

import type { Env } from '../../config/env.js';
import type { OnModuleInit } from '@nestjs/common';

/** Injection token of the file store. Tests replace it with `MemoryObjectStorage`. */
export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

/** Where uploaded files live. Only the S3 protocol is used, so any provider fits (04, D-34). */
export interface ObjectStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** The file, or null when it does not exist. */
  get(key: string): Promise<Buffer | null>;
}

/** S3-compatible storage: MinIO locally, a cloud provider in production (M7-10). */
@Injectable()
export class S3ObjectStorage implements ObjectStorage, OnModuleInit {
  private readonly logger = new Logger('ObjectStorage');
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(@Inject(ENV) env: Env) {
    this.bucket = env.S3_BUCKET;
    this.client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      // MinIO and most S3-compatible services address buckets by path, not by sub-domain.
      forcePathStyle: true,
      credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
    });
  }

  /** Creates the bucket when it is missing (a fresh local MinIO). Never blocks startup. */
  async onModuleInit(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Created bucket ${this.bucket}`);
      } catch (error) {
        this.logger.warn(`Bucket ${this.bucket} is not reachable: ${String(error)}`);
      }
    }
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const body = result.Body;
      if (!body || !(body instanceof Readable)) {
        return null;
      }
      const chunks: Buffer[] = [];
      for await (const chunk of body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      return Buffer.concat(chunks);
    } catch (error) {
      if (error instanceof Error && error.name === 'NoSuchKey') {
        return null;
      }
      throw error;
    }
  }
}

/** In-memory storage for tests: no network, no external service. */
export class MemoryObjectStorage implements ObjectStorage {
  readonly files = new Map<string, { body: Buffer; contentType: string }>();

  put(key: string, body: Buffer, contentType: string): Promise<void> {
    this.files.set(key, { body, contentType });
    return Promise.resolve();
  }

  get(key: string): Promise<Buffer | null> {
    return Promise.resolve(this.files.get(key)?.body ?? null);
  }
}
