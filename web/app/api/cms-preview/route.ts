import { NextResponse } from "next/server";
import { PREVIEW_MAX_BYTES } from "@/lib/cmsPreview";
import { deletePreviewDraft, putPreviewDraft } from "@/lib/previewStore";

/**
 * Stores a CMS draft so the site can render it in a preview frame.
 *
 * The draft has to reach the server, because the pages that render it are
 * server components — several are async and use `getTranslations`, which
 * cannot cross a client boundary. It is held in memory against an id the admin
 * generates and carries in the preview URL.
 *
 * A cookie was the obvious carrier and does not work: the dashboard and the
 * site are different origins, so it would need `SameSite=None`, which browsers
 * accept only with `Secure` — impossible on plain-HTTP local development. The
 * cookie was silently dropped and the preview kept showing saved content.
 *
 * Nothing is persisted: no database write, no cache entry, and the draft is
 * discarded on a timer. Publishing to the real site remains a separate,
 * deliberate save.
 */

/** Preview is per-request state, never cached. */
export const dynamic = "force-dynamic";

/**
 * Origins allowed to open a preview — the admin dashboard, nothing else.
 *
 * Set `CMS_PREVIEW_ORIGINS` (comma-separated) in production. The default covers
 * local development only, so a deployment that forgets it simply has no working
 * preview rather than an endpoint anyone can post drafts to.
 */
const ALLOWED_ORIGINS = (process.env.CMS_PREVIEW_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "content-type"
  };
}

export async function OPTIONS(request: Request): Promise<NextResponse> {
  // An unlisted origin gets no CORS headers, so the browser blocks the call.
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin"))
  });
}

/** Ids come from the admin; constrained so they cannot be used as a probe. */
const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export async function POST(request: Request): Promise<NextResponse> {
  const origin = request.headers.get("origin");
  const cors = corsHeaders(origin);
  if (origin && Object.keys(cors).length === 0) {
    return NextResponse.json({ ok: false, reason: "forbidden origin" }, { status: 403 });
  }

  const raw = await request.text();
  if (raw.length > PREVIEW_MAX_BYTES) {
    return NextResponse.json(
      { ok: false, reason: "draft too large", limit: PREVIEW_MAX_BYTES },
      { status: 413, headers: cors }
    );
  }

  let body: { id?: string; pageKey?: string; content?: unknown };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid json" },
      { status: 400, headers: cors }
    );
  }

  const { id, pageKey, content } = body;
  if (!id || !ID_PATTERN.test(id)) {
    return NextResponse.json(
      { ok: false, reason: "invalid id" },
      { status: 400, headers: cors }
    );
  }
  if (!pageKey || typeof pageKey !== "string") {
    return NextResponse.json(
      { ok: false, reason: "missing pageKey" },
      { status: 400, headers: cors }
    );
  }

  putPreviewDraft(id, pageKey, content);

  return NextResponse.json({ ok: true }, { headers: cors });
}

/** Discards a draft when its panel closes. */
export async function DELETE(request: Request): Promise<NextResponse> {
  const cors = corsHeaders(request.headers.get("origin"));
  const id = new URL(request.url).searchParams.get("id");
  if (id && ID_PATTERN.test(id)) deletePreviewDraft(id);
  return NextResponse.json({ ok: true }, { headers: cors });
}
