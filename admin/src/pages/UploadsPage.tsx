import { useCallback, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CalendarIcon,
  CameraIcon,
  ClockIcon,
  FileIcon,
  FolderIcon,
  MoreHorizontalIcon,
  SettingsIcon,
  ShieldIcon,
  UploadIcon
} from "@/components/icons";
import { MediaGrid } from "@/components/MediaGrid";
import { SkippedUploadsNotice } from "@/components/SkippedUploadsNotice";
import { SessionPicker } from "@/components/SessionPicker";
import { YouTubeLinkCard } from "@/components/YouTubeLinkCard";
import { useDashboardStatsQuery } from "@/hooks/useDashboardStats";
import { useMediaUpload, type RejectedUpload } from "@/hooks/useMediaUpload";
import { useLanguage } from "@/i18n/languageContext";
import type { PhotoSession } from "@/types/session";
import { computeUploadTotals } from "@/utils/uploadTotals";
import { formatBytes } from "@/utils/format";


const fileTypes = {
  image: { en: "Image", ar: "صورة" },
  video: { en: "Video", ar: "فيديو" }
};

const uploadStatuses = {
  uploading: { en: "Uploading", ar: "جاري الرفع" },
  queued: { en: "Queued", ar: "في الانتظار" },
  done: { en: "Completed", ar: "مكتمل" },
  error: { en: "Failed", ar: "فشل" }
};

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-line bg-card shadow-[0_18px_60px_rgba(25,25,25,0.04)] ${className}`}>
      {children}
    </section>
  );
}

function Thumb({ tone, video = false }: { tone: string; video?: boolean }) {
  return (
    <div className={`relative h-14 w-16 shrink-0 overflow-hidden rounded-md bg-gradient-to-br ${tone}`}>
      <div className="h-full rounded-md bg-[radial-gradient(circle_at_68%_28%,rgba(255,255,255,0.38),transparent_18%),linear-gradient(135deg,rgba(255,255,255,0.18),transparent)]" />
      {video ? (
        <span className="absolute inset-0 m-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white">
          ▶
        </span>
      ) : null}
    </div>
  );
}

function RemovableTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-accent/25 bg-[#f3eee7] px-2.5 text-sm text-[#9f733d]">
      <button
        type="button"
        onClick={onRemove}
        title={`Remove ${label}`}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-semibold leading-none text-danger shadow-sm ring-1 ring-danger/20 transition-colors hover:bg-danger hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
        aria-label={`Remove ${label}`}
      >
        x
      </button>
      <span className="pe-1">{label}</span>
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2.5 w-28 overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
    </div>
  );
}

export default function UploadsPage() {
  const [searchParams] = useSearchParams();
  const [sessionId, setSessionId] = useState(searchParams.get("sessionId") ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const [selectedSession, setSelectedSession] = useState<PhotoSession | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<RejectedUpload[]>([]);
  const { t } = useLanguage();

  const { data: dashboardStats, isPending: storagePending } = useDashboardStatsQuery();
  const { items, addFiles, retryItem, removeItem, clearCompleted, cancelItem, cancelAll } = useMediaUpload(sessionId);
  const totals = useMemo(() => computeUploadTotals(items), [items]);
  // Null means the API could not reach the bucket — distinct from a genuine
  // zero, so it must not fall back to 0 and report an empty bucket.
  const storageUsageBytes = dashboardStats?.storageUsageBytes ?? null;

  // Only real uploads. An empty queue used to be filled with three invented
  // rows stuck at fixed progress, which looked like a stalled transfer.
  const queueRows = items.map((item) => {
          const isVideo = item.file.type.startsWith("video/");
          const sessionTitle = selectedSession?.title;

          return {
            id: item.id,
            name: item.file.name,
            type: isVideo ? fileTypes.video : fileTypes.image,
            size: formatBytes(item.file.size),
            session: { en: sessionTitle ?? "", ar: sessionTitle ?? "" },
            progress: item.progress,
            status:
              item.status === "done"
                ? uploadStatuses.done
                : item.status === "error"
                  ? uploadStatuses.error
                  : item.status === "cancelled"
                    ? { en: "Cancelled", ar: "Cancelled" }
                    : item.status === "queued"
                      ? uploadStatuses.queued
                      : uploadStatuses.uploading,
            pending: item.status === "queued",
            error: item.error,
            canRetry: item.status === "error" || item.status === "cancelled",
            canCancel: !["done", "error", "cancelled"].includes(item.status),
            canRemove: true,
            thumb: isVideo ? "from-[#17191d] to-[#d8b36f]" : "from-[#d8b98b] to-[#25303b]"
          };
  });

  const handleFiles = (files: FileList | File[] | null) => {
    const nextFiles = files ? Array.from(files) : [];
    if (!nextFiles.length) return;
    if (!sessionId) {
      setUploadMessage(t("Select a session before uploading.", "اختر جلسة قبل الرفع."));
      return;
    }
    // Counts come from the queue itself: a folder pick can contain files the
    // pipeline rejects, and reporting the raw selection would overstate it.
    const { acceptedCount, rejected } = addFiles(nextFiles);
    setSkipped(rejected);
    setUploadMessage(
      acceptedCount > 0
        ? t(
            `${acceptedCount} files added to the upload queue.`,
            `تمت إضافة ${acceptedCount} ملفات إلى قائمة الرفع.`
          )
        : null
    );
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    handleFiles(event.dataTransfer.files);
  };

  const selectedSessionLabel =
    selectedSession?.title ?? t("No session selected", "لم يتم اختيار جلسة");
  const handleSessionChange = useCallback((nextSessionId: string) => {
    setSessionId(nextSessionId);
    if (!nextSessionId) setSelectedSession(null);
  }, []);

  const addTag = () => {
    const nextTag = tagInput.trim();
    if (!nextTag) return;
    setTags((current) =>
      current.some((tag) => tag.toLowerCase() === nextTag.toLowerCase())
        ? current
        : [...current, nextTag]
    );
    setTagInput("");
  };

  const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    }
  };

  const scrollToGuide = () => {
    setGuideOpen(true);
    guideRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const activeUploads = items.some((item) => !["done", "error", "cancelled"].includes(item.status));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <UploadIcon className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-semibold text-primary">{t("Uploads", "الرفع")}</h1>
          </div>
          <p className="mt-2 text-sm text-secondary">
            {t(
              "Upload and organize your files, and link them to sessions and clients",
              "ارفع ملفاتك ونظمها بسهولة وربطها بالجلسات والعملاء"
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={scrollToGuide}
            className="flex h-11 items-center gap-2 rounded-lg border border-line bg-card px-4 text-sm text-secondary hover:border-accent hover:text-primary"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-secondary/50 text-xs">?</span>
            {t("Upload guide", "دليل الرفع")}
          </button>
          
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[18rem_1fr_23rem]">
        <Card className="p-5">
          <div ref={guideRef} />
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary">{t("Upload tips", "نصائح للرفع")}</h2>
            <CameraIcon className="h-6 w-6 text-accent" />
          </div>
          {guideOpen ? (
            <div className="mb-4 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm leading-6 text-primary">
              {t(
                "Choose a session, add optional tags, then drag files into the upload area or choose files or folders from your device.",
                "Choose a session, add optional tags, then drag files into the upload area or choose files or folders from your device."
              )}
            </div>
          ) : null}
          <div className="space-y-5 text-sm text-secondary">
            <div className="flex items-start gap-4">
              <FolderIcon className="h-6 w-6 shrink-0 text-accent" />
              <p className="leading-6">
                {t(
                  "Use clear file names, for example: session_name_date",
                  "نوصي باستخدام أسماء واضحة للملفات مثل: اسم_الجلسة_التاريخ"
                )}
              </p>
            </div>
            <div className="flex items-start gap-4">
              <FileIcon className="h-6 w-6 shrink-0 text-accent" />
              <p className="leading-6">{t("Maximum size per file: 2 GB", "الحد الأقصى لكل ملف: 2 جيجابايت")}</p>
            </div>
            <div className="flex items-start gap-4">
              <CameraIcon className="h-6 w-6 shrink-0 text-accent" />
              <p className="leading-6">
                {t("Supported formats: JPG, PNG, WEBP, HEIC, MP4, MOV", "الصيغ المدعومة: JPG, PNG, WEBP, HEIC, MP4, MOV")}
              </p>
            </div>
            <div className="flex items-start gap-4">
              <ShieldIcon className="h-6 w-6 shrink-0 text-accent" />
              <p className="leading-6">{t("Your files are stored at original quality", "سيتم حفظ ملفاتك بجودتها الأصلية")}</p>
            </div>
          </div>
        </Card>

        {/* Middle column: the two ways to add media — upload a file, or link a
            video. They stack so both stay visible without scrolling. */}
        <div className="flex min-w-0 flex-col gap-5">
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
            if (sessionId) fileInputRef.current?.click();
          }}
          role="button"
          tabIndex={sessionId ? 0 : -1}
          onKeyDown={(event) => {
            if (sessionId && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`flex min-h-[19rem] flex-col items-center justify-center rounded-lg border-2 border-dashed bg-card px-8 text-center transition-colors ${
            dragActive ? "border-accent bg-accent/5" : "border-accent/70"
          } ${!sessionId ? "opacity-70" : ""}`}
        >
          <UploadIcon className="mb-6 h-16 w-16 text-secondary" />
          <h2 className="text-lg font-semibold text-primary">
            {t("Drag files here or click to upload", "اسحب الملفات هنا أو انقر للرفع")}
          </h2>
          <p className="mt-3 text-sm text-secondary">
            {t("You can upload photos or videos from your device", "يمكنك رفع صور أو فيديوهات من جهازك")}
          </p>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={!sessionId}
            className="mt-7 h-12 rounded-lg bg-[#171b24] px-8 text-sm font-medium text-white shadow-lg shadow-black/10 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {t("Choose files from your device", "اختر ملفات من جهازك")}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              folderInputRef.current?.click();
            }}
            disabled={!sessionId}
            className="mt-3 h-10 rounded-lg border border-line bg-card px-5 text-sm text-secondary hover:border-accent hover:text-primary disabled:cursor-not-allowed disabled:opacity-55"
          >
            {t("Choose folder", "اختر مجلداً")}
          </button>
          <p className="mt-5 text-xs text-secondary">
            {t("Up to 2 GB per file • JPG, PNG, WEBP, HEIC, MP4, MOV", "حتى 2 GB لكل ملف • JPG, PNG, WEBP, HEIC, MP4, MOV")}
          </p>
          {!sessionId ? (
            <p className="mt-2 text-xs text-danger">{t("Select a session before uploading", "اختر جلسة قبل الرفع")}</p>
          ) : null}
          {uploadMessage ? <p className="mt-2 text-xs text-success">{uploadMessage}</p> : null}
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
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-secondary" />
                <h2 className="text-base font-semibold text-primary">{t("Link session", "ربط الجلسة")}</h2>
                <span className="text-sm text-secondary">{t("(optional)", "(اختياري)")}</span>
              </div>
              <p className="mt-2 text-sm text-secondary">
                {t("Choose the session to attach these files to", "اختر الجلسة لربط الملفات بها")}
              </p>
            </div>
            <SessionPicker
              value={sessionId}
              onChange={handleSessionChange}
              onSelectedSessionChange={setSelectedSession}
            />
            <div className="mt-3 rounded-lg bg-base px-4 py-3 text-center text-sm leading-6 text-secondary">
              {t(
                "Files will be organized under this session for easy access later.",
                "سيتم تنظيم الملفات ضمن هذه الجلسة وسهولة الوصول إليها لاحقاً."
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-base font-semibold text-primary">{t("Add tags", "أضف علامات")}</h2>
              <span className="text-sm text-secondary">{t("(optional)", "(اختياري)")}</span>
            </div>
            <input
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={handleTagKeyDown}
              className="h-11 w-full rounded-lg border border-line bg-card px-4 text-sm outline-none placeholder:text-secondary/55 focus:border-accent"
              placeholder={t("Add a tag then press Enter", "أضف علامة ثم اضغط Enter")}
            />
            <button
              type="button"
              onClick={addTag}
              className="mt-3 h-10 rounded-lg bg-[#171b24] px-4 text-sm font-medium text-white"
            >
              {t("Add tag", "Add tag")}
            </button>
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <RemovableTag
                  key={tag}
                  label={tag}
                  onRemove={() => setTags((current) => current.filter((item) => item !== tag))}
                />
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_23rem]">
        <Card className="overflow-hidden p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-primary">{t("Upload queue", "قائمة الرفع")}</h2>
            <span className="text-sm text-secondary">
              {t(`${queueRows.length} files`, `${queueRows.length} ملفات`)}
            </span>
          </div>
          {/*
            Capped like the workspace queue: a folder pick can leave dozens of
            rows here, and an uncapped table pushed everything below it off the
            page. Vertical scroll is inside the box; horizontal scroll for the
            table's own min-width stays as it was.
          */}
          <div className="max-h-[30rem] overflow-x-auto overflow-y-auto overscroll-contain rounded-lg border border-line">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line bg-card text-secondary">
                  <Th>{t("Type", "النوع")}</Th>
                  <Th>{t("Size", "الحجم")}</Th>
                  <Th>{t("Session", "الجلسة")}</Th>
                  <Th>{t("Progress", "التقدم")}</Th>
                  <Th>{t("Status", "الحالة")}</Th>
                  <Th>{t("Action", "الإجراء")}</Th>
                </tr>
              </thead>
              <tbody>
                {queueRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-secondary">
                      {t(
                        "No files in the queue. Drop files above to start uploading.",
                        "لا توجد ملفات في قائمة الانتظار. أسقط الملفات بالأعلى لبدء الرفع."
                      )}
                    </td>
                  </tr>
                ) : null}
                {queueRows.map((item) => (
                  <tr key={item.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Thumb tone={item.thumb} video={item.type === fileTypes.video} />
                        <span className="text-primary">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-primary">{item.size}</td>
                    <td className="px-4 py-3 text-primary">
                      {item.session ? t(item.session.en, item.session.ar) : selectedSessionLabel}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProgressBar value={item.progress} />
                        <span className="w-10 text-xs text-secondary">
                          {item.pending ? t("Queued", "انتظار") : `${item.progress}%`}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      <span className="inline-flex items-center gap-2">
                        {item.pending || item.canRetry ? (
                          <ClockIcon className="h-4 w-4" />
                        ) : item.canCancel ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                        ) : (
                          <span className="h-4 w-4 rounded-full bg-success/20" />
                        )}
                        {t(item.status.en, item.status.ar)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.canRetry ? (
                        <button
                          type="button"
                          onClick={() => retryItem(item.id)}
                          className="me-2 h-9 rounded-lg border border-line px-3 text-xs text-primary hover:border-accent"
                        >
                          {t("Retry", "Retry")}
                        </button>
                      ) : null}
                      {item.canCancel ? (
                        <button
                          type="button"
                          onClick={() => cancelItem(item.id)}
                          className="me-2 h-9 rounded-lg border border-line px-3 text-xs text-secondary hover:border-danger hover:text-danger"
                        >
                          {t("Cancel", "Cancel")}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          if (item.id.startsWith("upload-")) removeItem(item.id);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-secondary hover:bg-base hover:text-primary"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={cancelAll}
              disabled={!activeUploads}
              className="flex h-10 items-center gap-3 rounded-lg border border-accent/40 px-5 text-sm text-[#9f733d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-lg">Ⅱ</span>
              {t("Cancel active", "إلغاء النشط")}
            </button>
            <button
              type="button"
              onClick={clearCompleted}
              disabled={!items.some((item) => item.status === "done")}
              className="h-10 rounded-lg border border-line px-4 text-sm text-secondary hover:border-accent hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("Clear completed", "Clear completed")}
            </button>
            <p className="text-sm text-secondary">
              {t(
                `Total: ${queueRows.length} files (${formatBytes(totals.totalBytes)})`,
                `الإجمالي: ${queueRows.length} ملفات (${formatBytes(totals.totalBytes)})`
              )}
            </p>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="mb-5 flex items-center gap-2">
              <MoreHorizontalIcon className="h-5 w-5 text-accent" />
              <h2 className="text-base font-semibold text-primary">{t("Upload summary", "ملخص الرفع")}</h2>
            </div>
            <div className="grid grid-cols-3 divide-x divide-line text-center" dir="ltr">
              <div>
                <p className="text-2xl font-semibold text-danger">{totals.failed || 0}</p>
                <p className="mt-1 text-sm text-secondary">{t("Failed", "فشل")}</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-primary">{totals.done || 0}</p>
                <p className="mt-1 text-sm text-secondary">{t("Completed", "مكتمل")}</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-accent">{items.length ? totals.inFlight : 3}</p>
                <p className="mt-1 text-sm text-secondary">{t("Uploading", "جاري الرفع")}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-accent" />
              <h2 className="text-base font-semibold text-primary">{t("Storage used", "التخزين المستخدم")}</h2>
            </div>
            {storagePending ? (
              <p className="text-sm text-secondary">{t("Loading storage...", "جارٍ تحميل التخزين...")}</p>
            ) : (
              <>
                <p className="text-3xl font-semibold text-primary">
                  {storageUsageBytes === null ? t("Unavailable", "غير متاح") : formatBytes(storageUsageBytes)}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-secondary">
                  {storageUsageBytes === null
                    ? t(
                        "Could not reach the media bucket. Everything else on this page still works.",
                        "تعذر الوصول إلى مساحة الوسائط. بقية الصفحة تعمل بشكل طبيعي."
                      )
                    : t(
                        "Live total of all files in your media bucket.",
                        "الإجمالي الحالي لجميع الملفات في مساحة الوسائط."
                      )}
                </p>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* The real media in the chosen session, where the cover is picked. Only
          shown once a session is selected — unscoped it would have nothing to
          list. */}
      {sessionId ? (
        <Card className="p-5">
          <MediaGrid sessionId={sessionId} coverImage={selectedSession?.coverImage} />
        </Card>
      ) : null}

    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  // Sticky so the column labels survive scrolling inside the capped queue box.
  // Needs its own background, or rows would show through as they pass under.
  return (
    <th className="sticky top-0 z-10 bg-card px-4 py-3 text-start text-xs font-medium text-secondary">
      {children}
    </th>
  );
}
