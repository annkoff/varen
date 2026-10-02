import "server-only";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { StorageDriver, StoredObject } from "./index";

const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/** Stores files on the server disk, outside of /public. Suitable for VPS/Docker with a volume. */
export class LocalStorage implements StorageDriver {
  private root: string;

  constructor(dir: string) {
    // Runtime-only directory: excluded from output file tracing.
    this.root = path.resolve(/* turbopackIgnore: true */ process.cwd(), dir);
  }

  private resolve(key: string): string {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error("Invalid storage key");
    return full;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const full = this.resolve(key);
    await fsp.mkdir(path.dirname(full), { recursive: true });
    await fsp.writeFile(full, data, { flag: "wx" });
  }

  async get(key: string): Promise<StoredObject | null> {
    const full = this.resolve(key);
    try {
      const stat = await fsp.stat(full);
      const stream = Readable.toWeb(fs.createReadStream(full)) as ReadableStream<Uint8Array>;
      return { body: stream, size: stat.size, contentType: MIME_BY_EXT[path.extname(full)] ?? "application/octet-stream" };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await fsp.rm(this.resolve(key), { force: true });
  }
}
