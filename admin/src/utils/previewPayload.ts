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
 *
 * Mirrored in `web/lib/previewPayload.ts`, which decodes what this produces.
 * The two must stay in step; the payload shape is deliberately tiny for that
 * reason.
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

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Read a stream into one buffer. */
async function collect(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
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
