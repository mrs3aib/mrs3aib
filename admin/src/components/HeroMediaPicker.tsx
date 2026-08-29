import { useState } from "react";
import { SelectField } from "@/components/SelectField";
import { TextField } from "@/components/TextField";
import { useLanguage } from "@/i18n/languageContext";
import {
  usePageAssetDelete,
  usePageAssetUpload,
  usePageAssetsQuery
} from "@/hooks/usePageAssetUpload";
import { storageKeyFromUrl, type PageAsset } from "@/services/pageContentService";
import type { CmsHero } from "@/types/pageContent";

export const HERO_VIDEO_MAX_DURATION_SECONDS = 60;
const HERO_VIDEO_MAX_DURATION_LABEL = "1 minute";
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];

/** Reads a local file's duration so an over-long hero video is caught before upload. */
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read video duration."));
    };
    video.src = objectUrl;
  });
}

function formatBytes(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

/**
 * Choose the hero's background: image or video, by upload, gallery pick, or URL.
 *
 * `mediaType` is what the public site switches on, so it is set automatically
 * from the file's MIME type on upload and on gallery selection — an admin who
 * uploads an MP4 and forgets the dropdown would otherwise get a still frame.
 * The dropdown stays editable for the URL case, where there is no file to
 * inspect.
 *
 * Uploads are saved through `onCommit` rather than left in the draft: the file
 * is already in the bucket, so a page left unsaved would strand it. `onCommit`
 * also reports which asset was replaced, so the caller can clean it up.
 */
export function HeroMediaPicker({
  pageKey,
  value,
  onChange,
  onCommit
}: {
  /** Which page's asset folder to upload into and list. */
  pageKey: string;
  value: CmsHero;
  onChange: (next: CmsHero) => void;
  /**
   * Persist a hero whose media just changed. Receives the storage key of the
   * asset it replaced, if any, so the caller can delete it after a good save.
   */
  onCommit?: (next: CmsHero, replacedKey?: string) => Promise<void>;
}) {
  const { t } = useLanguage();
  const uploadAsset = usePageAssetUpload(pageKey);
  const deleteAsset = usePageAssetDelete(pageKey);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<CmsHero>) => onChange({ ...value, ...patch });

  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return;

    const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);
    if (!file.type.startsWith("image/") && !isVideo) {
      setError(
        t(
          "Only images, MP4, WebM, and Ogg videos are allowed.",
          "يُسمح بالصور وفيديو MP4 و WebM و Ogg فقط."
        )
      );
      return;
    }

    if (isVideo) {
      try {
        const duration = await getVideoDuration(file);
        if (duration > HERO_VIDEO_MAX_DURATION_SECONDS) {
          setError(
            t(
              `Hero videos must be ${HERO_VIDEO_MAX_DURATION_LABEL} or shorter.`,
              "يجب ألا يزيد فيديو البطل عن دقيقة واحدة."
            )
          );
          return;
        }
      } catch {
        setError(
          t(
            "Could not read video duration. Please try another file.",
            "تعذّر قراءة مدة الفيديو. جرّب ملفًا آخر."
          )
        );
        return;
      }
    }

    setError(null);
    // Captured before the upload overwrites `mediaUrl`, otherwise the replaced
    // file becomes unreachable and lingers in the bucket forever.
    const replacedKey = storageKeyFromUrl(value.mediaUrl);

    try {
      const result = await uploadAsset.mutateAsync(file);
      const next: CmsHero = {
        ...value,
        mediaType: isVideo ? "video" : "image",
        mediaUrl: result.assetUrl
      };
      onChange(next);
      const stale =
        replacedKey && replacedKey !== result.storageKey ? replacedKey : undefined;
      await onCommit?.(next, stale);

      // Only once the new media is safely saved. A failure here leaves an
      // orphan, which is far better than deleting media the page still needs.
      if (stale) {
        try {
          await deleteAsset.mutateAsync(stale);
        } catch {
          // Non-fatal: the upload succeeded, which is what the admin asked for.
        }
      }
    } catch {
      setError(
        t("Could not upload file. Please try again.", "تعذّر رفع الملف. حاول مرة أخرى.")
      );
    }
  };

  const handleSelectAsset = (asset: PageAsset) => {
    setError(null);
    set({
      mediaUrl: asset.url,
      mediaType: asset.contentType.startsWith("video/") ? "video" : "image"
    });
  };

  const handleDeleteAsset = async (storageKey: string) => {
    const isCurrent = storageKeyFromUrl(value.mediaUrl) === storageKey;
    const label = isCurrent
      ? t(
          "This file is currently used by the page. Delete it permanently and clear it from the hero?",
          "هذا الملف مستخدم في الصفحة حاليًا. هل تريد حذفه نهائيًا وإزالته من البطل؟"
        )
      : t(
          "Delete this file permanently from storage?",
          "هل تريد حذف هذا الملف نهائيًا من التخزين؟"
        );
    if (!window.confirm(label)) return;

    setError(null);
    try {
      // Unreference before deleting, so a failure mid-way leaves an unused file
      // rather than a page pointing at bytes that no longer exist.
      if (isCurrent) {
        const next: CmsHero = { ...value, mediaUrl: "", posterUrl: "" };
        onChange(next);
        await onCommit?.(next);
      }
      await deleteAsset.mutateAsync(storageKey);
    } catch {
      setError(
        t("Could not delete file. Please try again.", "تعذّر حذف الملف. حاول مرة أخرى.")
      );
    }
  };

  const isVideo = (value.mediaType ?? "image") === "video";

  return (
    <div className="grid gap-4 rounded-md border border-line p-4">
      <span className="tracking-nav block text-xs font-medium uppercase text-secondary">
        {t("Hero media", "وسائط البطل")} · {t("ALL", "الكل")}
      </span>

      <SelectField
        label={t("Media type", "نوع الوسائط")}
        value={value.mediaType ?? "image"}
        onChange={(e) => set({ mediaType: e.target.value as "image" | "video" })}
      >
        <option value="image">{t("Image", "صورة")}</option>
        <option value="video">{t("Video", "فيديو")}</option>
      </SelectField>

      <div>
        <label
          htmlFor={`hero-media-upload-${pageKey}`}
          className="tracking-nav mb-2 block text-xs font-medium uppercase text-secondary"
        >
          {t("Upload image or video", "ارفع صورة أو فيديو")}
        </label>
        <p className="mb-2 text-xs text-secondary">
          {t(
            `Videos can be up to ${HERO_VIDEO_MAX_DURATION_LABEL} long. The type is set automatically from the file.`,
            "يمكن أن تصل مدة الفيديو إلى دقيقة واحدة. يُحدَّد النوع تلقائيًا من الملف."
          )}
        </p>
        <input
          id={`hero-media-upload-${pageKey}`}
          type="file"
          accept="image/*,video/mp4,video/webm,video/ogg"
          disabled={uploadAsset.isPending}
          onChange={(e) => {
            void handleFileUpload(e.target.files?.[0]);
            // Clear it so re-picking the same file fires `change` again.
            e.target.value = "";
          }}
          className="w-full rounded-md border border-line bg-base px-3.5 py-2.5 text-sm text-primary file:me-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-base disabled:cursor-not-allowed disabled:opacity-60"
        />
        {uploadAsset.isPending ? (
          <p className="mt-2 text-sm text-secondary">
            {t("Uploading media...", "جارٍ رفع الوسائط...")}
          </p>
        ) : null}
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      </div>

      <AssetLibrary
        pageKey={pageKey}
        currentUrl={value.mediaUrl}
        onSelect={handleSelectAsset}
        onDelete={(key) => void handleDeleteAsset(key)}
        deletingKey={deleteAsset.isPending ? deleteAsset.variables : undefined}
      />

      <TextField
        label={t("Or paste a media URL", "أو الصق رابط الوسائط")}
        value={value.mediaUrl ?? ""}
        onChange={(e) => set({ mediaUrl: e.target.value })}
        placeholder="https://..."
      />

      {isVideo ? (
        <TextField
          label={t("Video poster image URL", "رابط صورة غلاف الفيديو")}
          value={value.posterUrl ?? ""}
          onChange={(e) => set({ posterUrl: e.target.value })}
          placeholder={t("Shown while the video loads", "تظهر أثناء تحميل الفيديو")}
        />
      ) : null}

      <p className="text-xs text-secondary">
        {t(
          "Leave the URL blank to use the site's built-in visuals.",
          "اترك الرابط فارغًا لاستخدام صور الموقع الافتراضية."
        )}
      </p>
    </div>
  );
}

/**
 * Everything stored for this page, so an admin can preview, reuse, or delete
 * files instead of letting replaced media accumulate unseen.
 */
function AssetLibrary({
  pageKey,
  currentUrl,
  onSelect,
  onDelete,
  deletingKey
}: {
  pageKey: string;
  currentUrl?: string;
  onSelect: (asset: PageAsset) => void;
  onDelete: (storageKey: string) => void;
  deletingKey?: string;
}) {
  const { t } = useLanguage();
  const { data: assets, isPending, isError, refetch } = usePageAssetsQuery(pageKey);
  const currentKey = storageKeyFromUrl(currentUrl);

  if (isPending) {
    return (
      <div className="rounded-md border border-line p-3">
        <span className="block h-20 animate-pulse rounded bg-line" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md border border-danger/30 bg-danger/5 p-3">
        <p className="text-sm text-danger">
          {t("Could not load stored files.", "تعذّر تحميل الملفات المخزنة.")}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-2 text-xs font-medium uppercase text-danger underline underline-offset-2"
        >
          {t("Try again", "حاول مرة أخرى")}
        </button>
      </div>
    );
  }

  if (!assets?.length) {
    return (
      <div className="rounded-md border border-line p-3">
        <p className="text-sm text-secondary">
          {t(
            "No files stored for this page yet. Upload one above.",
            "لا توجد ملفات مخزنة لهذه الصفحة بعد. ارفع ملفًا بالأعلى."
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-line p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="tracking-nav text-xs font-medium uppercase text-secondary">
          {t("Stored files", "الملفات المخزنة")} ({assets.length})
        </span>
        <span className="text-xs text-secondary">
          {formatBytes(assets.reduce((sum, a) => sum + a.size, 0))}
        </span>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {assets.map((asset) => (
          <AssetCard
            key={asset.storageKey}
            asset={asset}
            isCurrent={asset.storageKey === currentKey}
            onSelect={() => onSelect(asset)}
            onDelete={() => onDelete(asset.storageKey)}
            isDeleting={deletingKey === asset.storageKey}
          />
        ))}
      </ul>
    </div>
  );
}

function AssetCard({
  asset,
  isCurrent,
  onSelect,
  onDelete,
  isDeleting
}: {
  asset: PageAsset;
  isCurrent: boolean;
  onSelect: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const { t } = useLanguage();
  const [failed, setFailed] = useState(false);
  const isVideo = asset.contentType.startsWith("video/");

  return (
    <li
      className={`overflow-hidden rounded border ${
        isCurrent ? "border-accent" : "border-line"
      }`}
    >
      <div className="flex h-32 items-center justify-center bg-base">
        {failed ? (
          <span className="px-2 text-center text-xs text-secondary">
            {t("Preview unavailable", "المعاينة غير متاحة")}
          </span>
        ) : isVideo ? (
          // `preload="metadata"` keeps a large video to a first-frame fetch —
          // loading several full videos into one page would be ruinous.
          <video
            src={asset.url}
            controls
            muted
            playsInline
            preload="metadata"
            onError={() => setFailed(true)}
            className="h-full w-full object-contain"
          />
        ) : (
          <img
            src={asset.url}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-contain"
          />
        )}
      </div>

      <div className="p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-secondary">{formatBytes(asset.size)}</span>
          <span className="flex items-center gap-1.5">
            <span className="tracking-nav rounded bg-line px-1.5 py-0.5 text-[10px] font-medium uppercase text-secondary">
              {isVideo ? t("Video", "فيديو") : t("Image", "صورة")}
            </span>
            {isCurrent ? (
              <span className="tracking-nav rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-accent">
                {t("In use", "قيد الاستخدام")}
              </span>
            ) : null}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={onSelect}
            disabled={isCurrent}
            className="text-xs font-medium uppercase text-primary underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("Use", "استخدام")}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="text-xs font-medium uppercase text-danger underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? t("Deleting...", "جارٍ الحذف...") : t("Delete", "حذف")}
          </button>
        </div>
      </div>
    </li>
  );
}
