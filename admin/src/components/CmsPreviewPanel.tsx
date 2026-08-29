import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/i18n/languageContext";

/**
 * Live preview of the public site, fed the editor's unsaved draft.
 *
 * The site is embedded as a real iframe rather than reimplemented here, so
 * what is shown is the actual page — real fonts, real layout, real responsive
 * behaviour — and it cannot drift from production the way a hand-built mockup
 * would.
 *
 * The draft is POSTed to the site's `/api/cms-preview`, which holds it against
 * a per-panel id, and the frame is then reloaded with that id in its URL. The
 * round trip exists because the site's pages are async server components: the
 * draft has to be in place *before* the page renders, so it cannot simply be
 * posted into the frame. Nothing is saved and the real site is untouched —
 * publishing stays a separate, deliberate action.
 *
 * Refreshing is manual. Each refresh is a full page reload, so doing it on
 * every edit meant the panel flickering and scrolling back to the top while
 * the editor was still typing. Instead the panel loads once, then marks itself
 * stale and waits to be asked.
 */

// Reuses the existing public-site variable rather than adding a second one
// that would have to be kept in step with it.
const WEB_BASE = import.meta.env.VITE_PUBLIC_SITE_URL ?? "http://localhost:3000";

type Viewport = "desktop" | "mobile";

/** Width the iframe is rendered at, then scaled down to fit the panel. */
const VIEWPORT_WIDTH: Record<Viewport, number> = {
  desktop: 1280,
  mobile: 390
};

type Status = "loading" | "ready" | "error" | "too-large";

export function CmsPreviewPanel({
  pageKey,
  path,
  content,
  locale
}: {
  /** CMS record the draft belongs to, e.g. `home` or `category-weddings`. */
  pageKey: string;
  /** Site-relative path to preview, e.g. `/` or `/category/weddings`. */
  path: string;
  /** The editor's current draft, in the shape the page renders. */
  content: unknown;
  /** Which language the admin is editing. */
  locale: string;
}) {
  const { t } = useLanguage();
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [status, setStatus] = useState<Status>("loading");
  const [scale, setScale] = useState(1);
  /**
   * The draft the frame is currently showing. Compared against the live draft
   * to tell whether the preview has fallen behind the editor.
   *
   * `null` until the first load, which is what makes that first refresh fire.
   */
  const [renderedDraft, setRenderedDraft] = useState<string | null>(null);

  /**
   * Identifies this panel's draft on the site. Generated once per mount so two
   * open editors cannot overwrite each other's preview.
   */
  const previewId = useMemo(() => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }, []);

  const src = useMemo(() => {
    const suffix = path === "/" ? "" : path;
    return `${WEB_BASE}/${locale}${suffix}?cmsPreview=1&previewId=${previewId}`;
  }, [path, locale, previewId]);

  /** Serialized so a re-render with an equal draft does not trigger a reload. */
  const serialized = useMemo(() => JSON.stringify(content ?? null), [content]);

  const refresh = useCallback(async () => {
    // Clear any previous error, otherwise a successful retry would keep the
    // failure overlay pinned over a perfectly good preview.
    setStatus("loading");
    try {
      const res = await fetch(`${WEB_BASE}/api/cms-preview`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: previewId,
          pageKey,
          content: JSON.parse(serialized)
        })
      });

      if (res.status === 413) {
        setStatus("too-large");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        return;
      }

      // The draft is stored; reloading is what makes the server render it.
      //
      // A unique parameter each time because refreshing by hand usually
      // reassigns the *same* URL, which browsers may treat as a no-op — the
      // frame would never reload and `onLoad` would never clear the overlay.
      const frame = frameRef.current;
      if (frame) frame.src = `${src}&r=${Date.now()}`;
      setRenderedDraft(serialized);
    } catch {
      // Usually the site's dev server not running.
      setStatus("error");
    }
  }, [pageKey, previewId, serialized, src]);

  /**
   * Load once on mount so the panel is not empty, then leave it alone.
   *
   * `refresh` is deliberately not a dependency: it changes with every edit,
   * which is exactly the auto-reloading this panel no longer does. The ref
   * keeps the latest version available without re-running the effect.
   */
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    void refreshRef.current();
    // A changed page or language is a different preview, not a stale one, so
    // those do reload on their own.
  }, [pageKey, locale, path]);

  /** Discard this panel's draft when it closes, rather than waiting on its TTL. */
  useEffect(() => {
    return () => {
      void fetch(`${WEB_BASE}/api/cms-preview?id=${previewId}`, {
        method: "DELETE"
      }).catch(() => {
        /* best effort — the draft expires on its own regardless */
      });
    };
  }, [previewId]);

  /**
   * Render the page at a real viewport width and scale it down to fit, rather
   * than letting a narrow iframe trigger the site's mobile layout. Previewing
   * the desktop design in a half-width panel is the whole point.
   */
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const fit = () => {
      const available = shell.clientWidth;
      if (!available) return;
      setScale(Math.min(1, available / VIEWPORT_WIDTH[viewport]));
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(shell);
    return () => observer.disconnect();
  }, [viewport]);

  /**
   * Whether the editor has moved on since the frame was rendered.
   *
   * Before the first load there is nothing to be stale against, so the button
   * reads as a plain refresh rather than announcing pending changes.
   */
  const isStale = renderedDraft !== null && renderedDraft !== serialized;

  const width = VIEWPORT_WIDTH[viewport];

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-line bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="tracking-nav text-xs font-medium uppercase text-secondary">
            {t("Preview", "معاينة")}
          </p>
          <p className="truncate text-xs text-secondary/80" dir="ltr">
            {path}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => void refresh()}
          // Announced so a screen reader hears that there are changes waiting,
          // which the dot alone would not convey.
          aria-label={
            isStale
              ? t(
                  "Refresh preview — the draft has changed",
                  "تحديث المعاينة — تغيّرت المسودة"
                )
              : t("Refresh preview", "تحديث المعاينة")
          }
          className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
            isStale
              ? "border-accent/40 bg-accent/10 text-primary hover:bg-accent/15"
              : "border-line text-secondary hover:bg-base"
          }`}
        >
          {isStale ? (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          ) : null}
          {t("Refresh", "تحديث")}
        </button>

        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-line p-1">
          {(["desktop", "mobile"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setViewport(option)}
              aria-pressed={viewport === option}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                viewport === option
                  ? "bg-primary text-white"
                  : "text-secondary hover:bg-base"
              }`}
            >
              {option === "desktop"
                ? t("Desktop", "سطح المكتب")
                : t("Mobile", "الجوال")}
            </button>
          ))}
        </div>
        </div>
      </div>

      <div
        ref={shellRef}
        className="relative min-h-0 flex-1 overflow-hidden rounded-b-lg bg-base"
      >
        {/*
          The iframe is laid out at full viewport width and visually scaled, so
          the site picks its real breakpoint rather than its mobile one.
        */}
        <div
          className="origin-top-left"
          style={{ width: width * scale, height: `${100 / scale}%` }}
        >
          <iframe
            ref={frameRef}
            title={t("Site preview", "معاينة الموقع")}
            onLoad={() => setStatus("ready")}
            className="border-0 bg-white"
            style={{
              width,
              height: "100%",
              transform: `scale(${scale})`,
              transformOrigin: "top left"
            }}
          />
        </div>

        {status !== "ready" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-base/90 p-6">
            <p className="max-w-xs text-center text-sm text-secondary">
              {status === "too-large"
                ? t(
                    "This draft is too long to preview. Save it to see the page.",
                    "هذه المسودة أطول من أن تُعاين. احفظها لرؤية الصفحة."
                  )
                : status === "error"
                  ? t(
                      "Preview unavailable — is the website running?",
                      "المعاينة غير متاحة — هل الموقع قيد التشغيل؟"
                    )
                  : t("Loading preview…", "جارٍ تحميل المعاينة…")}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
