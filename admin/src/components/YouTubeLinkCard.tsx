import { useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { addYouTubeLink } from "@/services/mediaService";
import { queryKeys } from "@/services/queryKeys";
import { useLanguage } from "@/i18n/languageContext";
import { VideoIcon } from "./icons";

/**
 * Adds a YouTube video to a session as a link rather than an upload.
 *
 * Nothing is transferred: the server parses the URL, keeps the video id, and
 * the item joins the session's assets immediately — so it shows up in the
 * gallery grid on the site next to the uploaded photos. It cannot be packed
 * into a ZIP, because there is no file of ours behind it.
 */
export function YouTubeLinkCard({ sessionId }: { sessionId: string }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const disabled = !sessionId || submitting;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!sessionId || !url.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await addYouTubeLink({
        sessionId,
        url: url.trim(),
        ...(title.trim() ? { title: title.trim() } : {})
      });
      setUrl("");
      setTitle("");
      setSuccess(t("Video added to this session.", "تمت إضافة الفيديو إلى هذه الجلسة."));
      // The grid below reads from the media list, and the dashboard counts
      // media — both are now stale.
      void queryClient.invalidateQueries({ queryKey: queryKeys.media.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
    } catch (err) {
      // The server explains exactly what was wrong with the link (not YouTube,
      // or already added), which is more useful than a generic failure.
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)?.message
        : undefined;
      setError(
        message ??
          t("Could not add this video. Please try again.", "تعذر إضافة هذا الفيديو. يرجى المحاولة مرة أخرى.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-lg border border-line bg-card p-5 shadow-[0_18px_60px_rgba(25,25,25,0.04)]">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-danger/10 text-danger">
          <VideoIcon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-primary">
            {t("Add a YouTube video", "إضافة فيديو يوتيوب")}
          </h2>
          <p className="mt-1 text-xs text-secondary">
            {t(
              "Paste a link to show the video with this session's assets. Nothing is uploaded, and linked videos cannot be downloaded.",
              "الصق رابطاً لعرض الفيديو مع أصول هذه الجلسة. لا يتم رفع أي ملف، ولا يمكن تحميل الفيديوهات المرتبطة."
            )}
          </p>
        </div>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
        <div>
          <label
            htmlFor="youtube-url"
            className="tracking-nav mb-2 block text-xs font-medium uppercase text-secondary"
          >
            {t("Video link", "رابط الفيديو")}
          </label>
          <input
            id="youtube-url"
            type="url"
            inputMode="url"
            dir="ltr"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={disabled}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full rounded-md border border-line bg-base px-3.5 py-2.5 text-sm text-primary outline-none transition-colors focus:border-accent disabled:opacity-55"
          />
        </div>

        <div>
          <label
            htmlFor="youtube-title"
            className="tracking-nav mb-2 block text-xs font-medium uppercase text-secondary"
          >
            {t("Title (optional)", "العنوان (اختياري)")}
          </label>
          <input
            id="youtube-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={disabled}
            placeholder={t("Highlight film", "فيلم الملخص")}
            className="w-full rounded-md border border-line bg-base px-3.5 py-2.5 text-sm text-primary outline-none transition-colors focus:border-accent disabled:opacity-55"
          />
        </div>

        {error ? (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        ) : null}
        {success ? <p className="text-xs text-success">{success}</p> : null}
        {!sessionId ? (
          <p className="text-xs text-danger">
            {t("Select a session first", "اختر جلسة أولاً")}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={disabled || !url.trim()}
          className="h-11 rounded-lg bg-[#171b24] px-6 text-sm font-medium text-white shadow-lg shadow-black/10 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {submitting ? t("Adding…", "جارٍ الإضافة…") : t("Add video", "إضافة الفيديو")}
        </button>
      </form>
    </section>
  );
}
