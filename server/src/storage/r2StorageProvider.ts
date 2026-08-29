import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import type { Readable } from "node:stream";
import { env } from "@/config/env";
import type { StorageProvider, StoredObject } from "./storageProvider";

const DEFAULT_UPLOAD_URL_TTL_SECONDS = 15 * 60;
const DEFAULT_DOWNLOAD_URL_TTL_SECONDS = 10 * 60;

/** Multipart chunk size. The S3 minimum for a non-final part is 5 MiB. */
const UPLOAD_PART_SIZE_BYTES = 8 * 1024 * 1024;

/**
 * Build a `Content-Disposition` value that survives any file name.
 *
 * The plain `filename="..."` form is byte-limited and breaks outright on a
 * quote or backslash, and originals here routinely carry non-ASCII names
 * (Arabic, accents). RFC 6266/5987 covers both: an ASCII-folded `filename` for
 * old clients, plus a percent-encoded `filename*` that every current browser
 * prefers. Control characters are stripped rather than encoded — they have no
 * legitimate place in a name and would only produce an unusable header.
 */
export function contentDispositionAttachment(fileName: string): string {
  const cleaned = fileName.replace(/[\u0000-\u001f\u007f]/g, "").trim() || "download";
  const ascii = cleaned.replace(/[^\u0020-\u007e]/g, "_").replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(cleaned);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export class R2StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.client = new S3Client({
      region: "auto",
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY,
        secretAccessKey: env.R2_SECRET_KEY
      }
    });
    this.bucket = env.R2_BUCKET;
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType
      })
    );
  }

  /**
   * Stream an object's bytes. The caller is responsible for consuming or
   * destroying the stream; leaving it open holds a socket from the pool.
   */
  async downloadStream(key: string): Promise<Readable> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key })
    );
    if (!result.Body) {
      throw new Error(`Object body empty for key: ${key}`);
    }
    return result.Body as Readable;
  }

  /**
   * Upload from a stream using multipart, so an archive of any size transfers
   * without a full in-memory copy. `queueSize: 1` keeps only one part buffered
   * at a time, which matters because the source is a live ZIP stream rather
   * than a seekable file.
   */
  async uploadStream(key: string, body: Readable, contentType: string): Promise<void> {
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType
      },
      queueSize: 1,
      partSize: UPLOAD_PART_SIZE_BYTES,
      // On failure, abort the multipart upload so no orphaned parts are billed.
      leavePartsOnError: false
    });
    await upload.done();
  }

  async download(key: string): Promise<Buffer> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key })
    );
    const byteArray = await result.Body?.transformToByteArray();
    if (!byteArray) {
      throw new Error(`Object body empty for key: ${key}`);
    }
    return Buffer.from(byteArray);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
    );
  }

  getUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds = DEFAULT_UPLOAD_URL_TTL_SECONDS
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  getDownloadUrl(
    key: string,
    expiresInSeconds = DEFAULT_DOWNLOAD_URL_TTL_SECONDS,
    downloadFileName?: string
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ...(downloadFileName
        ? {
            ResponseContentDisposition:
              contentDispositionAttachment(downloadFileName)
          }
        : {})
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async listObjects(prefix: string): Promise<StoredObject[]> {
    const objects: StoredObject[] = [];
    let continuationToken: string | undefined;

    do {
      const result = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken
        })
      );

      for (const item of result.Contents ?? []) {
        if (!item.Key) continue;
        objects.push({
          key: item.Key,
          size: item.Size ?? 0,
          lastModified: item.LastModified?.toISOString() ?? null
        });
      }

      continuationToken = result.IsTruncated
        ? result.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return objects.sort((a, b) => (b.lastModified ?? "").localeCompare(a.lastModified ?? ""));
  }

  async getUsageBytes(): Promise<number> {
    let total = 0;
    let continuationToken: string | undefined;

    do {
      const result = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          ContinuationToken: continuationToken
        })
      );

      for (const item of result.Contents ?? []) {
        total += item.Size ?? 0;
      }

      continuationToken = result.IsTruncated
        ? result.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return total;
  }
}
