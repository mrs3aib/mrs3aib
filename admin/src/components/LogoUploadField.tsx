import { useRef, useState } from "react";
import { TextField } from "./TextField";
import { usePageAssetUpload } from "@/hooks/usePageAssetUpload";
import { useLanguage } from "@/i18n/languageContext";

/**
 * A logo: uploaded from disk, or pasted as a URL.
 *
 * Both routes stay open because the two are genuinely different jobs — a
 * client sends over a logo file, or the company already hosts one and the
 * admin has the link. The URL field remains the source of truth either way;
 * uploading simply fills it in with the stored asset's URL.
 *
 * Nothing is saved here. The upload puts the file in the page's asset folder
 * and hands back a URL, which the caller holds in its draft until the page is
 * saved like any other edit.
 */

/**
 * Ceiling for a logo. The backend accepts far larger files — it is shared with
 * hero video — but a logo that big is a mistake worth catching before it is
 * uploaded and rendered at a couple of hundred pixels wide.
 */
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export function LogoUploadField({
  pageKey,
  label,
  value,
  onChange,
  name
}: {
  /** Asset folder the file is written to, e.g. `home`. */
  pageKey: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
  name?: string;
}) {
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
    if (file.size > MAX_LOGO_BYTES) {
      setError(t("Logo must be under 5 MB.", "يجب أن يكون الشعار أقل من 5 ميغابايت."));
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
        placeholder="https://.../logo.svg"
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
              ? t("Replace logo", "استبدال الشعار")
              : t("Upload logo", "رفع شعار")}
        </button>

        {value ? (
          <>
            {/*
              A transparent logo on a white tile, which is how the site shows
              it — a preview on the panel's own background would misrepresent
              any logo with light-coloured artwork.
            */}
            <span className="flex h-9 w-16 shrink-0 items-center justify-center overflow-hidden rounded border border-line bg-white">
              <img
                src={value}
                alt=""
                className="max-h-7 max-w-[3.5rem] object-contain"
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
