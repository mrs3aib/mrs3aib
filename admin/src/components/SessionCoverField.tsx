import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  removeSessionCover,
  setSessionCoverUrl,
  uploadSessionCover
} from "@/services/sessionService";
import { queryKeys } from "@/services/queryKeys";
import { useLanguage } from "@/i18n/languageContext";
import type { PhotoSession } from "@/types/session";

/**
 * The cover shown on this session's card in the home and category galleries.
 *
 * Set for the session specifically — uploaded from disk or pasted as a URL —
 * rather than taken from the album's own media. Without one the card falls back
 * to the pinned item and then to the first ready image, which for a video-led
 * album means a frozen first frame: the thing this field exists to avoid.
 *
 * The two routes are mutually exclusive, and the server enforces that: setting
 * either clears the other, so there is never a question of which is winning.
 */

/** A gallery card is a single still, so it is capped well below album media. */
const MAX_COVER_BYTES = 10 * 1024 * 1024;

export function SessionCoverField({ session }: { session: PhotoSession }) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  /**
   * The URL box is a draft until applied, so typing does not fire a request per
   * keystroke. Seeded from the saved value and resynced whenever it changes.
   */
  const [urlDraft, setUrlDraft] = useState(session.coverImageExternalUrl ?? "");
  const [lastSyncedUrl, setLastSyncedUrl] = useState(session.coverImageExternalUrl);
  if (lastSyncedUrl !== session.coverImageExternalUrl) {
    setLastSyncedUrl(session.coverImageExternalUrl);
    setUrlDraft(session.coverImageExternalUrl ?? "");
  }

  /**
   * The cover appears in the admin's own session lists and in the public
   * listings the CMS pickers read, so both caches are dropped rather than
   * tracking which entries hold this row.
   */
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.publicSessions.all() })
    ]);
  };

  const upload = useMutation({
    mutationFn: (file: File) => uploadSessionCover(session.id, file),
    onSuccess: invalidate
  });

  const remove = useMutation({
    mutationFn: () => removeSessionCover(session.id),
    onSuccess: invalidate
  });

  const setUrl = useMutation({
    mutationFn: (url: string) => setSessionCoverUrl(session.id, url),
    onSuccess: invalidate
  });

  const busy = upload.isPending || remove.isPending || setUrl.isPending;
  const hasCover = session.hasUploadedCover || Boolean(session.coverImageExternalUrl);

  const applyUrl = async () => {
    const url = urlDraft.trim();
    setError(null);

    if (!url) {
      setError(t("Enter an image URL.", "أدخل رابط صورة."));
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      setError(
        t(
          "URL must start with http:// or https://",
          "يجب أن يبدأ الرابط بـ http:// أو https://"
        )
      );
      return;
    }

    try {
      await setUrl.mutateAsync(url);
    } catch {
      setError(t("Could not save that URL.", "تعذر حفظ هذا الرابط."));
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError(t("Choose an image file.", "اختر ملف صورة."));
      return;
    }
    if (file.size > MAX_COVER_BYTES) {
      setError(t("Cover must be under 10 MB.", "يجب أن يكون الغلاف أقل من 10 ميغابايت."));
      return;
    }

    try {
      await upload.mutateAsync(file);
    } catch {
      setError(t("Upload failed. Please try again.", "فشل الرفع. حاول مرة أخرى."));
    } finally {
      // Cleared so picking the same file again still fires `change`.
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-lg border border-line bg-card p-5">
      <h3 className="text-sm font-semibold text-primary">
        {t("Gallery cover", "غلاف المعرض")}
      </h3>
      <p className="mt-1 text-xs text-secondary">
        {t(
          "Shown on this session's card in the home and category galleries. Without one, the card uses the pinned media or the first photo.",
          "يظهر على بطاقة هذه الجلسة في معرض الصفحة الرئيسية والتصنيفات. بدونه تستخدم البطاقة الوسائط المثبتة أو أول صورة."
        )}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <span className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded border border-line bg-base">
          {session.coverImageUrl ? (
            <img
              src={session.coverImageUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.visibility = "hidden";
              }}
            />
          ) : (
            <span className="px-2 text-center text-[10px] text-secondary">
              {t("No cover", "لا يوجد غلاف")}
            </span>
          )}
        </span>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setError(null);
                inputRef.current?.click();
              }}
              disabled={busy}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {upload.isPending
                ? t("Uploading…", "جارٍ الرفع…")
                : session.hasUploadedCover
                  ? t("Replace upload", "استبدال الملف")
                  : t("Upload cover", "رفع غلاف")}
            </button>

            {hasCover ? (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  remove.mutate();
                }}
                disabled={busy}
                className="text-xs font-medium text-danger underline underline-offset-2 disabled:opacity-60"
              >
                {remove.isPending ? t("Removing…", "جارٍ الإزالة…") : t("Remove", "إزالة")}
              </button>
            ) : null}
          </div>

          <p className="text-xs text-secondary">
            {session.hasUploadedCover
              ? t("Using an uploaded cover.", "يتم استخدام غلاف مرفوع.")
              : session.coverImageExternalUrl
                ? t("Using a linked cover.", "يتم استخدام غلاف مرتبط.")
                : t(
                    "Using the pinned media or first photo.",
                    "يتم استخدام الوسائط المثبتة أو أول صورة."
                  )}
          </p>
        </div>
      </div>

      {/* Or point at an image hosted elsewhere, for a cover that already lives
          somewhere and is to hand only as a link. */}
      <div className="mt-4 border-t border-line pt-4">
        <label
          htmlFor={`session-cover-url-${session.id}`}
          className="tracking-nav mb-2 block text-xs font-medium uppercase text-secondary"
        >
          {t("Or paste an image URL", "أو الصق رابط صورة")}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id={`session-cover-url-${session.id}`}
            type="url"
            inputMode="url"
            dir="ltr"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void applyUrl();
              }
            }}
            placeholder="https://..."
            disabled={busy}
            className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-1.5 text-xs text-primary outline-none transition-colors focus:border-accent disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => void applyUrl()}
            disabled={busy || urlDraft.trim() === (session.coverImageExternalUrl ?? "")}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {setUrl.isPending ? t("Saving…", "جارٍ الحفظ…") : t("Use URL", "استخدام الرابط")}
          </button>
        </div>
      </div>

      {error ? <p className="mt-3 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
