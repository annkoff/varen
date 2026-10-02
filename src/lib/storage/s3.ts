import "server-only";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { StorageDriver, StoredObject } from "./index";

interface S3Options {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

/**
 * Any S3-compatible private bucket: Yandex Object Storage, VK Cloud, Selectel,
 * Cloudflare R2, AWS S3, MinIO. The bucket must NOT be public.
 */
export class S3Storage implements StorageDriver {
  private client: S3Client;
  private bucket: string;

  constructor(o: S3Options) {
    this.bucket = o.bucket;
    this.client = new S3Client({
      endpoint: o.endpoint || undefined,
      region: o.region,
      forcePathStyle: o.forcePathStyle,
      credentials: { accessKeyId: o.accessKeyId, secretAccessKey: o.secretAccessKey },
    });
  }

  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data, ContentType: contentType })
    );
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!res.Body) return null;
      return {
        body: res.Body.transformToWebStream() as ReadableStream<Uint8Array>,
        contentType: res.ContentType ?? "application/octet-stream",
        size: res.ContentLength,
      };
    } catch (err) {
      if ((err as { name?: string }).name === "NoSuchKey") return null;
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
