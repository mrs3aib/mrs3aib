import { useLanguage } from "@/i18n/languageContext";
import type { UploadItem } from "@/store/uploadQueueStore";
import { formatBytes } from "@/utils/format";
import { CloseIcon } from "./icons";

export function UploadItemRow({
  item,
  onRetry,
  onRemove
}: {
  item: UploadItem;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useLanguage();
  const isRecoverable = item.status === "error" || item.status === "cancelled";
  const barColor = isRecoverable ? "bg-danger" : "bg-accent";
  const statusLabels: Partial<Record<UploadItem["status"], string>> = {
    queued: t("Queued", "في الانتظار"),
    requesting: t("Preparing…", "جارٍ التحضير…"),
    uploading: t("Uploading…", "جارٍ الرفع…"),
    confirming: t("Finalizing…", "جارٍ الإنهاء…"),
    done: t("Done", "تم"),
    error: t("Failed", "فشل")
  };

  return (
    <div className="flex items-center gap-4 border-b border-line px-4 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm text-primary">{item.file.name}</p>
          <span className="shrink-0 text-xs text-secondary">
            {formatBytes(item.file.size)}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${item.status === "done" ? 100 : item.progress}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <p
            className={`text-xs ${isRecoverable ? "text-danger" : "text-secondary"}`}
          >
            {isRecoverable && item.error
              ? item.error
              : (statusLabels[item.status] ?? t("Cancelled", "Cancelled"))}
          </p>
          {isRecoverable ? (
            <button
              type="button"
              onClick={() => onRetry(item.id)}
              className="tracking-nav text-[10px] font-medium uppercase text-accent"
            >
              {t("Retry", "إعادة المحاولة")}
            </button>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        aria-label={t("Remove", "إزالة")}
        onClick={() => onRemove(item.id)}
        className="shrink-0 text-secondary hover:text-primary"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}


