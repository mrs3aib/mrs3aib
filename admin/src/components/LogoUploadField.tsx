import { ImageUploadField } from "./ImageUploadField";
import { useLanguage } from "@/i18n/languageContext";

/**
 * A logo: uploaded from disk, or pasted as a URL.
 *
 * A thin preset over {@link ImageUploadField} — the generic field carries the
 * upload-or-URL behaviour, and this fixes the parts that are specific to a
 * logo: the tighter size cap and the white preview tile.
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

  return (
    <ImageUploadField
      pageKey={pageKey}
      label={label}
      name={name}
      value={value}
      onChange={onChange}
      placeholder="https://.../logo.svg"
      maxBytes={MAX_LOGO_BYTES}
      uploadLabel={t("Upload logo", "رفع شعار")}
      replaceLabel={t("Replace logo", "استبدال الشعار")}
      previewOnWhite
    />
  );
}
