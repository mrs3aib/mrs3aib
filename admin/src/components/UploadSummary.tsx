import { useLanguage } from "@/i18n/languageContext";
import { formatBytes } from "@/utils/format";
import type { UploadTotals } from "@/utils/uploadTotals";
import { ChevronDownIcon } from "./icons";

export function UploadSummary({
  totals,
  detailsOpen,
  onToggleDetails,
  onClearCompleted,
  hasCompleted
}: {
  totals: UploadTotals;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  onClearCompleted: () => void;
  hasCompleted: boolean;
}) {
  const { t } = useLanguage();

  // Green once everything finished cleanly, red if anything failed, accent
  // while work is still in flight.
  const barColor =
    totals.failed > 0
      ? "bg-danger"
      : totals.allSettled
        ? "bg-success"
        : "bg-accent";

  const statusText = totals.allSettled
    ? totals.failed > 0
      ? t(
          `${totals.done} uploaded, ${totals.failed} failed`,
          `${totals.done} تم رفعها، ${totals.failed} فشلت`
        )
      : t(`All ${totals.done} files uploaded`, `تم رفع جميع الملفات (${totals.done})`)
    : t(
        `Uploading ${totals.done + 1} of ${totals.total}`,
        `جارٍ رفع ${totals.done + 1} من ${totals.total}`
      );

  return (
    <div className="rounded-lg border border-line bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-primary">{statusText}</p>
        <span className="shrink-0 text-sm font-medium tabular-nums text-primary">
          {totals.percent}%
        </span>
      </div>

      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={totals.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("Overall upload progress", "التقدم الكلي للرفع")}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${totals.percent}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-secondary">
          {formatBytes(totals.uploadedBytes)} / {formatBytes(totals.totalBytes)}
        </p>

        <div className="flex items-center gap-4">
          {hasCompleted ? (
            <button
              type="button"
              onClick={onClearCompleted}
              className="tracking-nav text-[10px] font-medium uppercase text-secondary hover:text-primary"
            >
              {t("Clear completed", "مسح المكتمل")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onToggleDetails}
            aria-expanded={detailsOpen}
            className="tracking-nav inline-flex items-center gap-1 text-[10px] font-medium uppercase text-secondary hover:text-primary"
          >
            {detailsOpen
              ? t("Hide details", "إخفاء التفاصيل")
              : t("Show details", "عرض التفاصيل")}
            <ChevronDownIcon
              className={`h-3 w-3 transition-transform duration-200 ${
                detailsOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
