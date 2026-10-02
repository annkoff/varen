import "server-only";
import type { StorageDriver, StoredObject } from "./index";

/**
 * Supabase Storage (private bucket) through its REST API with the service-role key.
 * Used on serverless hosting (Vercel), where the local disk is not persistent.
 */
export class SupabaseStorage implements StorageDriver {
  constructor(private url: string, private key: string, private bucket: string) {
    this.url = url.replace(/\/$/, "");
  }

  private object(key: string) {
    return `${this.url}/storage/v1/object/${this.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
  }

  private headers(extra: Record<string, string> = {}) {
    return { authorization: `Bearer ${this.key}`, apikey: this.key, ...extra };
  }

  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    const res = await fetch(this.object(key), {
      method: "POST",
      headers: this.headers({ "content-type": contentType, "x-upsert": "false", "cache-control": "max-age=31536000" }),
      body: new Uint8Array(data),
    });
    if (!res.ok) throw new Error(`Supabase upload failed: ${res.status} ${await res.text()}`);
  }

  async get(key: string): Promise<StoredObject | null> {
    const res = await fetch(this.object(key), { headers: this.headers() });
    if (res.status === 404 || res.status === 400) return null;
    if (!res.ok || !res.body) throw new Error(`Supabase download failed: ${res.status}`);
    const size = Number(res.headers.get("content-length")) || undefined;
    return { body: res.body, contentType: res.headers.get("content-type") ?? "application/octet-stream", size };
  }

  async delete(key: string): Promise<void> {
    await fetch(`${this.url}/storage/v1/object/${this.bucket}`, {
      method: "DELETE",
      headers: this.headers({ "content-type": "application/json" }),
      body: JSON.stringify({ prefixes: [key] }),
    });
  }
}
