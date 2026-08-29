import type { Readable } from "node:stream";

export interface StorageProvider {
  /** Uploads a buffer directly (used server-side, e.g. generated thumbnails). */
  upload(key: string, body: Buffer, contentType: string): Promise<void>;

  /** Downloads an object's full contents (used to fetch a browser-uploaded original for processing). */
  download(key: string): Promise<Buffer>;

  /**
   * Opens an object as a stream, so a large file can be consumed without ever
   * being fully resident. `download` buffers the whole object, which is fine
   * for a thumbnail but not for archiving a gallery of originals.
   */
  downloadStream(key: string): Promise<Readable>;

  /**
   * Uploads from a stream via multipart, so the body never has to exist in
   * memory as one buffer. Used for ZIP archives, which can be many gigabytes.
   */
  uploadStream(key: string, body: Readable, contentType: string): Promise<void>;

  delete(key: string): Promise<void>;

  /** A time-limited URL the browser can PUT a file to directly. */
  getUploadUrl(key: string, contentType: string, expiresInSeconds?: number): Promise<string>;

  /** A time-limited URL the browser can GET/download a file from. */
  getDownloadUrl(key: string, expiresInSeconds?: number, downloadFileName?: string): Promise<string>;

  /** Total bytes currently stored by this provider. */
  getUsageBytes(): Promise<number>;

  /** Every object under a key prefix, for browsing stored files. */
  listObjects(prefix: string): Promise<StoredObject[]>;
}

export type StoredObject = {
  key: string;
  size: number;
  lastModified: string | null;
};
