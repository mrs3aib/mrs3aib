/**
 * Encoding for a preview draft carried in the preview URL.
 *
 * The draft used to live only in `previewStore.ts`, in the rendering process's
 * memory. That works on one long-lived server and fails on a serverless
 * deployment: the POST that stores the draft and the render that needs it are
 * routinely handled by different instances, so the render found nothing and
 * silently fell back to saved content. The preview then showed published
 * copy no matter what the editor did, which is worse than an error — it looks
 * like the preview works.
 *
 * Carrying the draft in the URL removes the shared state entirely: whichever
 * instance serves the framed request already holds everything it needs.
 * Gzipped because CMS drafts are repetitive JSON that compresses by roughly
 * an order of magnitude, and base64url because the value is a query parameter.
 *
 * The store stays as the path for drafts too large to travel this way.
 */

/** Query parameter carrying an inline draft. */
export const PREVIEW_DATA_PARAM = "previewData";

/**
 * Ceiling on the encoded value.
 *
 * Kept well under the ~8 KB that proxies and servers commonly allow for a
 * request line, since the encoded draft is only part of the URL. A draft that
 * does not fit falls back to the store rather than producing a request that
 * some hop between the browser and the render silently rejects.
 */
export const PREVIEW_DATA_MAX_CHARS = 4096;

/**
 * Ceiling on a draft *after* decompression.
 *
 * Matches the store's own per-draft cap, so an inline draft can never be
 * larger than one sent the other way.
 */
export const PREVIEW_DECODED_MAX_BYTES = 512 * 1024;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  // Backed by a plain ArrayBuffer so the result is a valid `BlobPart`; the
  // default Uint8Array type also admits SharedArrayBuffer, which is not.
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Read a stream into one buffer, refusing to grow past `limit`.
 *
 * The limit is what makes decoding safe: a few hundred URL characters of gzip
 * can expand to megabytes, so bounding only the encoded length would let a
 * crafted preview link exhaust memory on the rendering instance. Reading is
 * abandoned as soon as the budget is passed rather than after the fact.
 */
async function collect(
  stream: ReadableStream<Uint8Array>,
  limit = Number.POSITIVE_INFINITY
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.length;
      if (total > limit) {
        await reader.cancel();
        throw new Error("preview draft exceeds decoded size limit");
      }
      chunks.push(value);
    }
  }
  const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/**
 * Encode a draft for the URL, or null when it would be too long.
 *
 * Null is a normal outcome, not a failure: the caller falls back to posting
 * the draft to the store.
 */
export async function encodePreviewDraft(
  pageKey: string,
  content: unknown
): Promise<string | null> {
  try {
    const json = JSON.stringify({ k: pageKey, c: content });
    const compressed = await collect(
      new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"))
    );
    const encoded = toBase64Url(compressed);
    return encoded.length <= PREVIEW_DATA_MAX_CHARS ? encoded : null;
  } catch {
    return null;
  }
}

/**
 * Decode a draft from the URL.
 *
 * Returns null for anything malformed. The value is attacker-supplied in the
 * sense that it arrives in a URL, so every failure path has to be a quiet
 * null rather than a thrown error that would break the page render.
 */
export async function decodePreviewDraft(
  value: string,
  pageKey: string
): Promise<unknown | null> {
  if (!value || value.length > PREVIEW_DATA_MAX_CHARS) return null;
  try {
    const bytes = fromBase64Url(value);
    const json = new TextDecoder().decode(
      await collect(
        new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")),
        PREVIEW_DECODED_MAX_BYTES
      )
    );
    const parsed = JSON.parse(json) as { k?: unknown; c?: unknown };
    // The page key is carried inside the payload and checked here for the same
    // reason the store checks it: one page must never render another's draft.
    if (typeof parsed.k !== "string" || parsed.k !== pageKey) return null;
    return parsed.c ?? null;
  } catch {
    return null;
  }
}
