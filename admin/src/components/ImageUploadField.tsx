import { useRef, useState } from "react";
import { TextField } from "./TextField";
import { usePageAssetUpload } from "@/hooks/usePageAssetUpload";
import { useLanguage } from "@/i18n/languageContext";

/**
 * An image: uploaded from disk, or pasted as a URL.
 *
 * Both routes stay open because the two are genuinely different jobs — someone
 * sends over a file, or the image is already hosted and the admin has the link.
 * The URL field remains the source of truth either way; uploading simply fills
 * it in with the stored asset's URL.
 *
 * Nothing is saved here. The upload puts the file in the page's asset folder
 * and hands back a URL, which the caller holds in its draft until the page is
 * saved like any other edit.
 */

/** Default ceiling. The backend accepts far more — it is shared with hero video. */
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

export type ImageUploadFieldProps = {
  /** Asset folder the file is written to, e.g. `home`. */
  pageKey: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
  name?: string;
  placeholder?: string;
  /** Reject files larger than this before uploading. */
  maxBytes?: number;
  /** Button copy when the field is empty / already has an image. */
  uploadLabel?: string;
  replaceLabel?: string;
  /**
   * Preview on a white tile with the image fully contained, the way a logo is
   * shown on the site. Artwork with light colours would otherwise vanish
   * against the panel's own background.
   */
  previewOnWhite?: boolean;
};

export function ImageUploadField({
  pageKey,
  label,
  value,
  onChange,
  name,
  placeholder = "https://...",
  maxBytes = DEFAULT_MAX_BYTES,
  uploadLabel,
  replaceLabel,
  previewOnWhite = false
}: ImageUploadFieldProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploadAsset = usePageAssetUpload(pageKey);
  const [error, setError] = useState<string | null>(null);

  const pick = () => {
    setError(null);
    inputRef.current?.click();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError(t("Choose an image file.", "اختر ملف صورة."));
      return;
    }
    if (file.size > maxBytes) {
      const mb = Math.round(maxBytes / (1024 * 1024));
      setError(
        t(`Image must be under ${mb} MB.`, `يجب أن تكون الصورة أقل من ${mb} ميغابايت.`)
      );
      return;
    }

    try {
      const asset = await uploadAsset.mutateAsync(file);
      onChange(asset.assetUrl);
    } catch {
      setError(t("Upload failed. Please try again.", "فشل الرفع. حاول مرة أخرى."));
    } finally {
      /**
       * Cleared so picking the same file again still fires `change` — without
       * this, retrying after a failure looks like nothing happened.
       */
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <TextField
        label={label}
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        error={error ?? undefined}
      />

      <div className="mt-2 flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={pick}
          disabled={uploadAsset.isPending}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploadAsset.isPending
            ? t("Uploading…", "جارٍ الرفع…")
            : value
              ? (replaceLabel ?? t("Replace image", "استبدال الصورة"))
              : (uploadLabel ?? t("Upload image", "رفع صورة"))}
        </button>

        {value ? (
          <>
            <span
              className={
                previewOnWhite
                  ? "flex h-9 w-16 shrink-0 items-center justify-center overflow-hidden rounded border border-line bg-white"
                  : "flex h-9 w-16 shrink-0 items-center justify-center overflow-hidden rounded border border-line bg-base"
              }
            >
              <img
                src={value}
                alt=""
                className={
                  previewOnWhite
                    ? "max-h-7 max-w-[3.5rem] object-contain"
                    : "h-full w-full object-cover"
                }
                // A broken or mistyped URL hides the preview rather than
                // showing the browser's broken-image glyph.
                onError={(e) => {
                  e.currentTarget.style.visibility = "hidden";
                }}
                onLoad={(e) => {
                  e.currentTarget.style.visibility = "visible";
                }}
              />
            </span>
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-xs font-medium text-danger underline underline-offset-2"
            >
              {t("Clear", "مسح")}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
