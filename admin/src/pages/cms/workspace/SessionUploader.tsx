import { useRef, useState, type DragEvent } from "react";
import { UploadIcon } from "@/components/icons";
import { SkippedUploadsNotice } from "@/components/SkippedUploadsNotice";
import { YouTubeLinkCard } from "@/components/YouTubeLinkCard";
import { useMediaUpload, type RejectedUpload } from "@/hooks/useMediaUpload";
import { useLanguage } from "@/i18n/languageContext";
import { computeUploadTotals } from "@/utils/uploadTotals";
import {
  countByUploadFilter,
  matchesUploadFilter,
  type UploadFilter
} from "@/utils/uploadFilters";
import { formatBytes } from "@/utils/format";

/**
 * Drop zone + live queue for one session, scoped tight enough to sit inside a
 * page workspace tab. The standalone Uploads page keeps its own wider layout;
 * this is the embedded variant where the session is already decided.
 */
export function SessionUploader({
  sessionId,
  sessionTitle
}: {
  sessionId: string;
  sessionTitle?: string;
}) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [skipped, setSkipped] = useState<RejectedUpload[]>([]);
  const [queueDetailsVisible, setQueueDetailsVisible] = useState(true);
  const [queueFilter, setQueueFilter] = useState<UploadFilter>("all");
  const {
    items,
    addFiles,
    retryItem,
    retryIncomplete,
    removeItem,
    clearCompleted,
    cancelItem,
    cancelAll
  } = useMediaUpload(sessionId);

  const totals = computeUploadTotals(items);
  const filterCounts = countByUploadFilter(items);
  const visibleItems = items.filter((item) => matchesUploadFilter(item, queueFilter));
  // Counts what the retry button would actually re-run — not every unfinished
  // item, since files mid-transfer are left alone. A count that included them
  // would promise more than the button delivers.
  const incompleteCount = items.filter(
    (item) =>
      item.status === "error" || item.status === "cancelled" || item.status === "queued"
  ).length;
  const activeUploads = items.some(
    (item) => !["done", "error", "cancelled"].includes(item.status)
  );

  const handleFiles = (files: FileList | File[] | null) => {
    const nextFiles = files ? Array.from(files) : [];
    if (!nextFiles.length) return;
    // Picking a folder hands over everything inside it, so anything the
    // pipeline cannot take is reported instead of quietly dropped.
    setSkipped(addFiles(nextFiles).rejected);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div className="space-y-5">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        // Clicking the dropzone's own surface opens the file picker, but not a
        // click coming from the nested buttons or from the hidden inputs. The
        // inputs dispatch a *native* click when opened programmatically, which
        // bubbles here past any React-level stopPropagation and would open a
        // second, plain-file dialog on top of the folder one.
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("button, input")) return;
          fileInputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-card px-8 text-center transition-colors ${
          dragActive ? "border-accent bg-accent/5" : "border-accent/70"
        }`}
      >
        <UploadIcon className="mb-4 h-12 w-12 text-secondary" />
        <h3 className="text-base font-semibold text-primary">
          {t("Drag files here or click to upload", "اسحب الملفات هنا أو انقر للرفع")}
        </h3>
        {sessionTitle ? (
          <p className="mt-2 max-w-md truncate text-sm text-secondary">
            {t(`Files go to "${sessionTitle}"`, `ستضاف الملفات إلى "${sessionTitle}"`)}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="h-11 rounded-lg bg-[#171b24] px-6 text-sm font-medium text-white shadow-lg shadow-black/10 transition-colors hover:bg-[#222834]"
          >
            {t("Choose files", "اختر ملفات")}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              folderInputRef.current?.click();
            }}
            className="h-11 rounded-lg border border-line bg-card px-5 text-sm text-secondary transition-colors hover:border-accent hover:text-primary"
          >
            {t("Choose folder", "اختر مجلداً")}
          </button>
        </div>
        <p className="mt-4 text-xs text-secondary">
          {t(
            "Up to 2 GB per file • JPG, PNG, WEBP, HEIC, MP4, MOV",
            "حتى 2 GB لكل ملف • JPG, PNG, WEBP, HEIC, MP4, MOV"
          )}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          // Directory-picker attributes, declared in vite-env.d.ts. They must
          // carry the string "true": an empty value leaves the dialog in plain
          // file mode, which offers "Open" on a folder instead of selecting it.
          webkitdirectory="true"
          directory="true"
          mozdirectory="true"
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      <SkippedUploadsNotice skipped={skipped} onDismiss={() => setSkipped([])} />

      <YouTubeLinkCard sessionId={sessionId} />

      {items.length ? (
        <div className="rounded-lg border border-line">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h3 className="text-sm font-semibold text-primary">
              {t("Upload queue", "قائمة الرفع")}
            </h3>
            <p className="text-xs text-secondary">
              {t(
                `${items.length} files (${formatBytes(totals.totalBytes)}) • ${totals.done} done • ${totals.failed} failed`,
                `${items.length} ملفات (${formatBytes(totals.totalBytes)}) • ${totals.done} مكتمل • ${totals.failed} فشل`
              )}
            </p>
            {/*
              Sits with the counts rather than only in the footer, so a batch
              that ends "35 done, 12 failed" can be re-run without expanding
              the details first — the failures are announced here, so the fix
              belongs here too.
            */}
            {incompleteCount > 0 ? (
              <button
                type="button"
                onClick={retryIncomplete}
                className="h-8 rounded-lg border border-accent bg-accent/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-accent/15"
              >
                {t(
                  `Retry ${incompleteCount} incomplete`,
                  `إعادة رفع ${incompleteCount} غير مكتمل`
                )}
              </button>
            ) : null}
            <button
              type="button"
              aria-expanded={queueDetailsVisible}
              onClick={() => setQueueDetailsVisible((visible) => !visible)}
              className="h-8 rounded-lg border border-line px-3 text-xs font-medium text-secondary transition-colors hover:border-accent hover:text-primary"
            >
              {queueDetailsVisible ? t("Hide details", "إخفاء التفاصيل") : t("Show details", "إظهار التفاصيل")}
            </button>
          </div>

          {queueDetailsVisible ? <>
          {/*
            Status filter. After a large batch the useful question is which
            files did not make it — scrolling 47 rows hunting for 12 failures
            is the thing this avoids.
          */}
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            {(["all", "incomplete", "failed", "done"] as const).map((option) => {
              const label = {
                all: t("All", "الكل"),
                incomplete: t("Incomplete", "غير مكتمل"),
                failed: t("Failed", "فشل"),
                done: t("Completed", "مكتمل")
              }[option];
              const active = queueFilter === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setQueueFilter(option)}
                  aria-pressed={active}
                  className={`h-8 rounded-lg border px-3 text-xs font-medium transition-colors ${
                    active
                      ? "border-accent bg-accent/10 text-primary"
                      : "border-line text-secondary hover:border-accent hover:text-primary"
                  }`}
                >
                  {label}
                  <span className="ms-1.5 tabular-nums text-secondary">
                    {filterCounts[option]}
                  </span>
                </button>
              );
            })}
          </div>

          {/*
            Capped and scrolled rather than growing without bound. A folder pick
            routinely queues dozens of files, and at full height the list pushed
            the rest of the page — including the sessions table below — off
            screen. `overscroll-contain` keeps a scroll that reaches the end of
            this list from carrying on into the page behind it.
          */}
          <ul className="max-h-[26rem] divide-y divide-line overflow-y-auto overscroll-contain">
            {visibleItems.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-secondary">
                {t("No files match this filter.", "لا توجد ملفات تطابق هذا الفلتر.")}
              </li>
            ) : null}
            {visibleItems.map((item) => {
              const canRetry = item.status === "error" || item.status === "cancelled";
              const canCancel = !["done", "error", "cancelled"].includes(item.status);
              return (
                <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 truncate text-sm text-primary">
                    {item.file.name}
                  </span>
                  <span className="shrink-0 text-xs text-secondary">
                    {formatBytes(item.file.size)}
                  </span>
                  <div className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-line">
                    <div
                      className={`h-full rounded-full transition-[width] ${
                        item.status === "error" ? "bg-danger" : "bg-accent"
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 truncate text-xs text-secondary">
                    {item.status === "error"
                      ? (item.error ?? t("Failed", "فشل"))
                      : item.status === "done"
                        ? t("Completed", "مكتمل")
                        : item.status === "queued"
                          ? t("Queued", "في الانتظار")
                          : item.status === "cancelled"
                            ? t("Cancelled", "أُلغي")
                            : `${item.progress}%`}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    {canRetry ? (
                      <button
                        type="button"
                        onClick={() => retryItem(item.id)}
                        className="h-8 rounded-lg border border-line px-3 text-xs text-primary transition-colors hover:border-accent"
                      >
                        {t("Retry", "إعادة")}
                      </button>
                    ) : null}
                    {canCancel ? (
                      <button
                        type="button"
                        onClick={() => cancelItem(item.id)}
                        className="h-8 rounded-lg border border-line px-3 text-xs text-secondary transition-colors hover:border-danger hover:text-danger"
                      >
                        {t("Cancel", "إلغاء")}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label={t("Remove from queue", "إزالة من القائمة")}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-base hover:text-primary"
                    >
                      ×
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-4 py-3">
            <button
              type="button"
              onClick={cancelAll}
              disabled={!activeUploads}
              className="h-9 rounded-lg border border-accent/40 px-4 text-xs text-[#9f733d] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("Cancel active", "إلغاء النشط")}
            </button>
            <button
              type="button"
              onClick={clearCompleted}
              disabled={!items.some((item) => item.status === "done")}
              className="h-9 rounded-lg border border-line px-4 text-xs text-secondary transition-colors hover:border-accent hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("Clear completed", "مسح المكتمل")}
            </button>
          </div>
          </> : null}
        </div>
      ) : null}
    </div>
  );
}
