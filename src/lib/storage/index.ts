import "server-only";
import { randomBytes } from "node:crypto";
import { env } from "../env";
import { LocalStorage } from "./local";
import { S3Storage } from "./s3";
import { SupabaseStorage } from "./supabase";

export interface StoredObject {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  size?: number;
}

export interface StorageDriver {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}

let driver: StorageDriver | null = null;

/**
 * Private file storage. Files are never served directly from a public bucket or /public —
 * lead files go through an authenticated admin route, catalog images through /media.
 */
export function storage(): StorageDriver {
  if (driver) return driver;
  const e = env();
  if (e.STORAGE_DRIVER === "s3") {
    if (!e.S3_BUCKET || !e.S3_ACCESS_KEY_ID || !e.S3_SECRET_ACCESS_KEY) {
      throw new Error("STORAGE_DRIVER=s3 requires S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY");
    }
    driver = new S3Storage({
      endpoint: e.S3_ENDPOINT,
      region: e.S3_REGION,
      bucket: e.S3_BUCKET,
      accessKeyId: e.S3_ACCESS_KEY_ID,
      secretAccessKey: e.S3_SECRET_ACCESS_KEY,
      forcePathStyle: e.S3_FORCE_PATH_STYLE,
    });
  } else if (e.STORAGE_DRIVER === "supabase") {
    if (!e.SUPABASE_URL || !e.SUPABASE_SERVICE_ROLE_KEY) throw new Error("STORAGE_DRIVER=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    driver = new SupabaseStorage(e.SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, e.SUPABASE_BUCKET);
  } else {
    driver = new LocalStorage(e.STORAGE_LOCAL_DIR);
  }
  return driver;
}

/** Random, non-guessable object key: `<prefix>/2026/10/<random>.<ext>` */
export function newStorageKey(prefix: "leads" | "media", ext: string): string {
  const d = new Date();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${prefix}/${d.getUTCFullYear()}/${month}/${randomBytes(16).toString("hex")}.${ext}`;
}

export function isSafeKey(key: string): boolean {
  return /^(leads|media)\/\d{4}\/\d{2}\/[a-f0-9]{32}\.(pdf|jpg|png|webp)$/.test(key);
}
