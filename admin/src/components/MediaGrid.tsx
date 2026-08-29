import { useEffect, useMemo, useState } from "react";
import { useMediaQuery, useDeleteMedia } from "@/hooks/useMedia";
import { useUpdateSession } from "@/hooks/useSessions";
import { ConfirmDialog } from "./ConfirmDialog";
import { Pagination } from "./Pagination";
import { formatBytes } from "@/utils/format";
import { CloseIcon, StarIcon, TrashIcon, VideoIcon } from "./icons";
import { useLanguage } from "@/i18n/languageContext";
import type { Media, MediaType } from "@/types/media";

const PAGE_SIZE = 24;

const statusStyles: Record<Media["processingStatus"], string> = {
  processing: "bg-secondary/10 text-secondary",
  ready: "bg-success/10 text-success",
  failed: "bg-danger/10 text-danger"
};

function previewSourceFor(item: Media): string | null {
  return item.sourceUrl ?? item.thumbnailUrl;
}

function preloadPreviewMedia(item: Media | undefined): Promise<void> {
  if (!item || item.type !== "image") return Promise.resolve();
  const src = previewSourceFor(item);
  if (!src) return Promise.resolve();

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
  });
}

export function MediaGrid({
  sessionId,
  coverImage
}: {
  sessionId: string;
  /** Media id currently pinned as the cover, so the grid can mark it. */
  coverImage?: string | null;
}) {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<MediaType | "">("");
  const [pendingDelete, setPendingDelete] = useState<Media | null>(null);
  const [previewItem, setPreviewItem] = useState<Media | null>(null);
  const [previewDirection, setPreviewDirection] = useState<"previous" | "next">("next");
  const [displayedCover, setDisplayedCover] = useState<string | null | undefined>(coverImage);
  const { t } = useLanguage();
  const updateSession = useUpdateSession();

  // Bring the local value back in sync after a server update or external
  // session refresh. Between click and response, `displayedCover` is the
  // optimistic value so the selected tile reacts immediately.
  useEffect(() => {
    setDisplayedCover(coverImage);
  }, [coverImage]);

  /** Pin this item as the cover, or unpin it when it is already the cover. */
  const setCover = (mediaId: string) => {
    const previousCover = displayedCover ?? null;
    const nextCover = previousCover === mediaId ? null : mediaId;

    setDisplayedCover(nextCover);
    updateSession.mutate({
      id: sessionId,
      payload: { coverImage: nextCover }
    }, {
      // A failed request must not leave the UI claiming a cover that was never
      // persisted. Restore exactly what was selected before the click.
      onError: () => setDisplayedCover(previousCover)
    });
  };

  const statusLabels: Record<Media["processingStatus"], string> = {
    processing: t("Processing", "قيد المعالجة"),
    ready: t("Ready", "جاهز"),
    failed: t("Failed", "فشل")
  };

  const { data, isPending, isError } = useMediaQuery(
    {
      sessionId,
      page,
      pageSize: PAGE_SIZE,
      ...(typeFilter ? { type: typeFilter } : {})
    },
    // This grid is always session-scoped; without a session there is nothing
    // to show, and an unscoped request would fetch the entire library.
    { enabled: Boolean(sessionId) }
  );
  const deleteMedia = useDeleteMedia();
  const previewItems = useMemo(() => data?.items ?? [], [data?.items]);
  const previewIndex = previewItem
    ? previewItems.findIndex((item) => item.id === previewItem.id)
    : -1;
  const hasPreviousPreview = previewIndex > 0;
  const hasNextPreview = previewIndex >= 0 && previewIndex < previewItems.length - 1;

  const showPreviousPreview = async () => {
    if (!hasPreviousPreview) return;
    const target = previewItems[previewIndex - 1];
    setPreviewDirection("previous");
    await preloadPreviewMedia(target);
    setPreviewItem(target ?? null);
  };

  const showNextPreview = async () => {
    if (!hasNextPreview) return;
    const target = previewItems[previewIndex + 1];
    setPreviewDirection("next");
    await preloadPreviewMedia(target);
    setPreviewItem(target ?? null);
  };

  useEffect(() => {
    if (previewIndex < 0) return;
    void preloadPreviewMedia(previewItems[previewIndex - 1]);
    void preloadPreviewMedia(previewItems[previewIndex + 1]);
  }, [previewIndex, previewItems]);

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteMedia.mutate(pendingDelete.id, {
      onSuccess: () => setPendingDelete(null)
    });
  };

  if (!sessionId) return null;

  return (
    <div className="mt-10">
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="tracking-nav text-xs font-medium uppercase text-secondary">
          {t("Media in this session", "الوسائط في هذه الجلسة")}
          {data ? ` (${data.total})` : ""}
        </p>

        <div className="flex items-center gap-2">
          {(["", "image", "video"] as const).map((value) => (
            <button
              key={value || "all"}
              type="button"
              onClick={() => {
                setTypeFilter(value);
                setPage(1);
              }}
              className={`tracking-nav rounded-full px-3 py-1.5 text-[10px] font-medium uppercase transition-colors ${
                typeFilter === value
                  ? "bg-accent text-base"
                  : "border border-line text-secondary hover:text-primary"
              }`}
            >
              {value === "" ? t("All", "الكل") : value === "image" ? t("Photos", "الصور") : t("Videos", "الفيديوهات")}
            </button>
          ))}
        </div>
      </div>

      {isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg border border-line bg-card" />
          ))}
        </div>
      ) : isError ? (
        <p className="rounded-lg border border-line bg-card p-6 text-sm text-danger">
          {t("Could not load media for this session.", "تعذر تحميل وسائط هذه الجلسة.")}
        </p>
      ) : !data || data.items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-card/50 p-8 text-center text-sm text-secondary">
          {t("No media uploaded to this session yet.", "لم يتم رفع أي وسائط لهذه الجلسة بعد.")}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {data.items.map((item) => (
              <MediaTile
                key={item.id}
                item={item}
                statusLabel={statusLabels[item.processingStatus]}
                isCover={displayedCover === item.id}
                onPreview={() => {
                  setPreviewDirection("next");
                  setPreviewItem(item);
                }}
                onSetCover={() => setCover(item.id)}
                onDelete={() => setPendingDelete(item)}
              />
            ))}
          </div>

          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={t("Delete media", "حذف الوسائط")}
        description={
          pendingDelete
            ? t(
                `Permanently delete “${pendingDelete.originalName}”? This removes the original and its generated thumbnail from storage and cannot be undone.`,
                `هل تريد حذف “${pendingDelete.originalName}” نهائياً؟ سيؤدي ذلك إلى إزالة الملف الأصلي والصورة المصغرة من التخزين ولا يمكن التراجع عنه.`
              )
            : ""
        }
        confirmLabel={t("Delete", "حذف")}
        destructive
        loading={deleteMedia.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <MediaPreviewOverlay
        item={previewItem}
        direction={previewDirection}
        hasPrevious={hasPreviousPreview}
        hasNext={hasNextPreview}
        onPrevious={showPreviousPreview}
        onNext={showNextPreview}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  );
}

function MediaTile({
  item,
  statusLabel,
  isCover,
  onPreview,
  onSetCover,
  onDelete
}: {
  item: Media;
  statusLabel: string;
  isCover: boolean;
  onPreview: () => void;
  onSetCover: () => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPreview}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPreview();
        }
      }}
      className={`group relative overflow-hidden rounded-lg border bg-card ${
        isCover ? "border-accent ring-2 ring-accent/40" : "border-line"
      } cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50`}
    >
      <div className="relative aspect-square bg-base">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt={item.originalName} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-secondary">
            {item.type === "video" ? <VideoIcon className="h-7 w-7" /> : <span className="text-[10px] uppercase tracking-nav">{t("No preview", "لا توجد معاينة")}</span>}
          </div>
        )}

        {item.type === "video" ? (
          <span className="absolute start-2 top-2 rounded bg-black/60 p-1 text-primary backdrop-blur-sm">
            <VideoIcon className="h-3.5 w-3.5" />
          </span>
        ) : null}

        {isCover ? (
          <span className="tracking-nav absolute inset-x-2 top-2 mx-auto w-fit rounded-full bg-accent px-2 py-0.5 text-[9px] font-medium uppercase text-base">
            {t("Cover", "الغلاف")}
          </span>
        ) : null}

        {item.processingStatus !== "ready" ? (
          <span className={`tracking-nav absolute end-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-medium uppercase ${statusStyles[item.processingStatus]}`}>
            {statusLabel}
          </span>
        ) : null}

        {/* Only a processed file can be a cover — the public site resolves the
            pin against ready media, so pinning anything else would silently
            fall back to the automatic pick. */}
        {item.processingStatus === "ready" ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSetCover();
            }}
            aria-pressed={isCover}
            title={
              isCover
                ? t("Remove as cover", "إزالة كصورة غلاف")
                : t("Set as cover", "تعيين كغلاف")
            }
            aria-label={
              isCover
                ? t("Remove as cover", "إزالة كصورة غلاف")
                : t("Set as cover", "تعيين كغلاف")
            }
            className={`absolute bottom-2 start-2 flex h-9 w-9 items-center justify-center rounded-md shadow-lg backdrop-blur-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
              isCover
                ? "bg-accent text-white hover:bg-accent/90"
                : "bg-white/92 text-primary hover:bg-accent hover:text-white"
            }`}
          >
            <StarIcon className="h-4 w-4" filled={isCover} />
          </button>
        ) : null}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          aria-label={t(`Delete ${item.originalName}`, `حذف ${item.originalName}`)}
          className="absolute bottom-2 end-2 flex h-9 w-9 items-center justify-center rounded-md bg-white/92 text-danger shadow-lg backdrop-blur-md transition-colors hover:bg-danger hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="px-2.5 py-2">
        <p className="truncate text-xs text-primary" title={item.originalName}>{item.originalName}</p>
        <p className="mt-0.5 text-[10px] text-secondary">
          {/* A linked video has no byte size of ours to report — say where it
              lives instead of rendering an empty or zero measurement. */}
          {item.source === "youtube" ? "YouTube" : formatBytes(item.size ?? 0)}
          {item.width && item.height ? ` · ${item.width}×${item.height}` : ""}
        </p>
      </div>
    </div>
  );
}

function MediaPreviewOverlay({
  item,
  direction,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onClose
}: {
  item: Media | null;
  direction: "previous" | "next";
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!item) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && hasPrevious) onPrevious();
      if (event.key === "ArrowRight" && hasNext) onNext();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [hasNext, hasPrevious, item, onClose, onNext, onPrevious]);

  if (!item) return null;

  const previewUrl = previewSourceFor(item);
  const youtubeEmbedUrl =
    item.source === "youtube" && item.externalId
      ? `https://www.youtube.com/embed/${item.externalId}`
      : null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={item.originalName}
      onClick={onClose}
    >
      <style>
        {`
          @keyframes mediaPreviewFromNext {
            from { opacity: 0; transform: translateX(28px) scale(0.985); }
            to { opacity: 1; transform: translateX(0) scale(1); }
          }

          @keyframes mediaPreviewFromPrevious {
            from { opacity: 0; transform: translateX(-28px) scale(0.985); }
            to { opacity: 1; transform: translateX(0) scale(1); }
          }

          .media-preview-content-next {
            animation: mediaPreviewFromNext 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }

          .media-preview-content-previous {
            animation: mediaPreviewFromPrevious 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }
        `}
      </style>
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1115] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{item.originalName}</p>
            <p className="mt-0.5 text-xs text-white/55">
              {item.source === "youtube" ? "YouTube" : formatBytes(item.size ?? 0)}
              {item.width && item.height ? ` · ${item.width}×${item.height}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Close preview", "إغلاق المعاينة")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black p-4">
          <PreviewNavButton
            direction="previous"
            disabled={!hasPrevious}
            onClick={onPrevious}
          />
          <PreviewNavButton
            direction="next"
            disabled={!hasNext}
            onClick={onNext}
          />

          <div
            key={item.id}
            className={`flex h-full w-full items-center justify-center ${
              direction === "previous"
                ? "media-preview-content-previous"
                : "media-preview-content-next"
            }`}
          >
          {youtubeEmbedUrl ? (
            <iframe
              src={youtubeEmbedUrl}
              title={item.originalName}
              className="aspect-video max-h-[75vh] w-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : item.type === "video" && item.sourceUrl ? (
            <video
              src={item.sourceUrl}
              poster={item.thumbnailUrl ?? undefined}
              controls
              className="max-h-[75vh] max-w-full rounded-lg"
            />
          ) : item.type === "image" && previewUrl ? (
            <img
              src={previewUrl}
              alt={item.originalName}
              className="max-h-[75vh] max-w-full rounded-lg object-contain"
            />
          ) : item.thumbnailUrl ? (
            <div className="space-y-4 text-center">
              <img
                src={item.thumbnailUrl}
                alt={item.originalName}
                className="mx-auto max-h-[65vh] max-w-full rounded-lg object-contain"
              />
              <p className="text-sm text-white/65">
                {t(
                  "Video playback is not available for this item, so its thumbnail is shown.",
                  "تشغيل الفيديو غير متاح لهذا العنصر، لذلك يتم عرض الصورة المصغرة."
                )}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 px-6 py-10 text-center text-white/65">
              <VideoIcon className="mx-auto h-8 w-8" />
              <p className="mt-3 text-sm">
                {t("Preview is not available for this media.", "المعاينة غير متاحة لهذه الوسائط.")}
              </p>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewNavButton({
  direction,
  disabled,
  onClick
}: {
  direction: "previous" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const { t } = useLanguage();
  const isPrevious = direction === "previous";

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      aria-label={isPrevious ? t("Previous media", "الوسائط السابقة") : t("Next media", "الوسائط التالية")}
      className={`absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-3xl leading-none text-white backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:cursor-not-allowed disabled:opacity-25 ${
        isPrevious ? "start-4" : "end-4"
      }`}
    >
      <span aria-hidden="true" className="-mt-1">
        {isPrevious ? "‹" : "›"}
      </span>
    </button>
  );
}


