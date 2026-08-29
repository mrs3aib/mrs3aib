import "server-only";

/**
 * Short-lived, in-memory store for CMS preview drafts.
 *
 * The draft has to be on the server before the page renders, because the pages
 * are async server components. The obvious carrier — a cookie — does not work
 * here: the admin dashboard and the site are different origins, so the cookie
 * must be `SameSite=None`, which browsers only accept alongside `Secure`, which
 * plain-HTTP local development cannot provide. The cookie was silently dropped
 * and the preview kept showing saved content.
 *
 * So the draft is held here instead and addressed by an unguessable id carried
 * in the preview URL. That works identically on HTTP and HTTPS, and keeps the
 * draft out of the URL itself, which would otherwise land in server logs.
 *
 * Deliberately in-memory: a preview draft is worthless seconds after it is
 * written, and this avoids adding a database write or a Redis dependency to
 * what is only a viewing aid. On a multi-instance deployment a preview may land
 * on an instance that does not hold the draft, which falls back to saved
 * content rather than failing — acceptable for a preview, and the reason this
 * is not used for anything that must be durable.
 */

/** A draft is discarded this long after its last write. */
const TTL_MS = 30 * 60 * 1000;

/** Ceiling on retained drafts, so a long session cannot grow this unbounded. */
const MAX_ENTRIES = 50;

type Entry = { pageKey: string; content: unknown; expiresAt: number };

/**
 * Survives the module reloads Next performs in development, which would
 * otherwise drop every draft on each edit of a server file.
 */
const globalForPreview = globalThis as unknown as {
  __cmsPreviewStore?: Map<string, Entry>;
};

const store: Map<string, Entry> =
  globalForPreview.__cmsPreviewStore ?? new Map<string, Entry>();
globalForPreview.__cmsPreviewStore = store;

function evictExpired(): void {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (entry.expiresAt <= now) store.delete(id);
  }

  // Oldest-first eviction if the store is still over budget.
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next();
    if (oldest.done) break;
    store.delete(oldest.value);
  }
}

/** Store a draft under `id`, replacing any previous draft for that id. */
export function putPreviewDraft(id: string, pageKey: string, content: unknown): void {
  evictExpired();
  // Re-inserted rather than mutated so the entry moves to the end of the Map's
  // insertion order, which is what makes the eviction above oldest-first.
  store.delete(id);
  store.set(id, { pageKey, content, expiresAt: Date.now() + TTL_MS });
}

/**
 * The draft stored for `id`, if it exists, has not expired, and belongs to
 * `pageKey` — so one page can never render another's draft.
 */
export function getPreviewDraft(id: string, pageKey: string): unknown | null {
  const entry = store.get(id);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    store.delete(id);
    return null;
  }

  if (entry.pageKey !== pageKey) return null;
  return entry.content;
}

export function deletePreviewDraft(id: string): void {
  store.delete(id);
}
