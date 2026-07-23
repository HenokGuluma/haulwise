// Storage abstraction for uploaded documents (BOL/POD/rate confirmations).
// Two implementations behind the same interface, selected via
// STORAGE_DRIVER=local|s3 (defaults to local):
//
// - local: writes to a gitignored ./uploads directory. Works for local dev
//   and for the Docker Compose self-hosted deployment path (mount a volume
//   at /app/uploads there for persistence across container restarts).
//   Does NOT work on serverless platforms like Vercel — there is no
//   persistent writable disk shared across function invocations.
// - s3: structurally ready for any S3-compatible bucket (AWS S3, Cloudflare
//   R2, Supabase Storage all speak the same REST API) but stubbed — it
//   validates config and throws until real credentials are wired up and the
//   signed PUT/GET/DELETE calls are implemented below. Swapping it in is a
//   config + implementation change here only; no caller changes.
//
// Not imported with "server-only" because prisma/seed.ts (run via tsx, not
// the Next.js bundler) also needs it.

import fs from "node:fs/promises";
import path from "node:path";

export type StoredFile = { key: string; sizeBytes: number; mimeType: string };

export interface StorageDriver {
  put(key: string, buffer: Buffer, mimeType: string): Promise<StoredFile>;
  get(key: string): Promise<{ buffer: Buffer; mimeType: string } | null>;
  delete(key: string): Promise<void>;
}

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

class LocalDiskStorage implements StorageDriver {
  async put(key: string, buffer: Buffer, mimeType: string): Promise<StoredFile> {
    const filePath = path.join(UPLOAD_ROOT, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    await fs.writeFile(filePath + ".meta.json", JSON.stringify({ mimeType }));
    return { key, sizeBytes: buffer.byteLength, mimeType };
  }

  async get(key: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const filePath = path.join(UPLOAD_ROOT, key);
    try {
      const buffer = await fs.readFile(filePath);
      let mimeType = "application/octet-stream";
      try {
        mimeType = JSON.parse(await fs.readFile(filePath + ".meta.json", "utf-8")).mimeType ?? mimeType;
      } catch {
        // missing/corrupt sidecar — fall back to the generic type
      }
      return { buffer, mimeType };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(UPLOAD_ROOT, key);
    await fs.unlink(filePath).catch(() => {});
    await fs.unlink(filePath + ".meta.json").catch(() => {});
  }
}

class StubS3Storage implements StorageDriver {
  private requireConfig() {
    if (!process.env.S3_BUCKET) {
      throw new Error(
        "STORAGE_DRIVER=s3 but S3_BUCKET is not set. Configure S3_BUCKET, S3_ENDPOINT, S3_REGION, " +
          "S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY, then implement the signed PUT/GET/DELETE " +
          "requests in src/lib/storage.ts (StubS3Storage) — the StorageDriver interface and every " +
          "caller already treat this the same as the local driver."
      );
    }
  }
  async put(): Promise<StoredFile> {
    this.requireConfig();
    throw new Error("S3 storage driver is a stub — see the comment in src/lib/storage.ts.");
  }
  async get(): Promise<{ buffer: Buffer; mimeType: string } | null> {
    this.requireConfig();
    throw new Error("S3 storage driver is a stub — see the comment in src/lib/storage.ts.");
  }
  async delete(): Promise<void> {
    this.requireConfig();
    throw new Error("S3 storage driver is a stub — see the comment in src/lib/storage.ts.");
  }
}

let driver: StorageDriver | null = null;

export function getStorageDriver(): StorageDriver {
  if (!driver) {
    driver = process.env.STORAGE_DRIVER === "s3" ? new StubS3Storage() : new LocalDiskStorage();
  }
  return driver;
}

export const ALLOWED_DOCUMENT_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);
export const MAX_DOCUMENT_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
