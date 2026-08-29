import { useLanguage } from "@/i18n/languageContext";
import type { RejectedUpload } from "@/hooks/useMediaUpload";

const PREVIEW_LIMIT = 5;

/**
 * Reports files that never entered the upload queue.
 *
 * Choosing a folder sweeps in everything it contains — OS metadata, XMP
 * sidecars, RAW originals — and the queue would otherwise just come back
 * shorter than the selection with no explanation.
 */
export function SkippedUploadsNotice({
  skipped,
  onDismiss
}: {
  skipped: RejectedUpload[];
  onDismiss: () => void;
}) {
  const { t } = useLanguage();
  if (!skipped.length) return null;

  const byType = skipped.filter((file) => file.reason === "type");
  const bySize = skipped.filter((file) => file.reason === "size");
  const preview = skipped.slice(0, PREVIEW_LIMIT);
  const remaining = skipped.length - preview.length;

  return (
    <div className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-primary">
          {t(
            `${skipped.length} ${skipped.length === 1 ? "file was" : "files were"} skipped`,
            `تم تخطي ${skipped.length} ${skipped.length === 1 ? "ملف" : "ملفات"}`
          )}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t("Dismiss", "إغلاق")}
          className="shrink-0 text-secondary transition-colors hover:text-primary"
        >
          ×
        </button>
      </div>

      <ul className="mt-2 space-y-1 text-xs text-secondary">
        {byType.length ? (
          <li>
            {t(
              `${byType.length} not a supported photo or video format`,
              `${byType.length} ليست بصيغة صورة أو فيديو مدعومة`
            )}
          </li>
        ) : null}
        {bySize.length ? (
          <li>
            {t(`${bySize.length} over the 2 GB limit`, `${bySize.length} تتجاوز حد 2 جيجابايت`)}
          </li>
        ) : null}
      </ul>

      <p className="mt-2 break-words text-xs text-secondary/90">
        {preview.map((file) => file.name).join(", ")}
        {remaining > 0 ? t(` and ${remaining} more`, ` و${remaining} أخرى`) : ""}
      </p>
    </div>
  );
}
