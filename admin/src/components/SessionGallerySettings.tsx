import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { FancyDatePicker } from "@/components/FancyDatePicker";
import { ShieldIcon } from "@/components/icons";
import { TextField } from "@/components/TextField";
import { Toggle } from "@/components/Toggle";
import {
  useGallerySettingsQuery,
  useUpdateGallerySettings
} from "@/hooks/useGallerySettings";
import { usePageAssetUpload } from "@/hooks/usePageAssetUpload";
import { useLanguage } from "@/i18n/languageContext";
import type { GallerySettings } from "@/types/gallerySettings";

/**
 * Download, watermark, password, and expiry rules for one session's gallery.
 *
 * Takes only a session id so it can sit wherever a session is already in hand:
 * Settings picks one first, while the CMS media tab already has one selected.
 * Both render the same form against the same endpoint, so the two can never
 * show different rules for the same session.
 */
export function SessionGallerySettings({ sessionId }: { sessionId: string }) {
  const { data, isPending, isError, refetch } = useGallerySettingsQuery(sessionId);
  const updateSettings = useUpdateGallerySettings(sessionId);
  const uploadWatermark = usePageAssetUpload(`watermark-${sessionId}`);
  const { t } = useLanguage();
  const [draft, setDraft] = useState<GallerySettings | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  if (isError) {
    return (
      <div className="mt-5 max-w-lg rounded-lg border border-danger/30 bg-danger/5 p-5">
        <p className="text-sm text-danger">
          {t("Could not load gallery settings.", "تعذر تحميل إعدادات المعرض.")}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-3 text-xs font-medium text-danger underline underline-offset-2"
        >
          {t("Try again", "حاول مرة أخرى")}
        </button>
      </div>
    );
  }

  if (isPending || !draft) {
    return (
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="block h-14 animate-pulse rounded-md bg-line" />
        ))}
      </div>
    );
  }

  const handleSave = async () => {
    setSaveError(null);
    setSaved(false);
    try {
      await updateSettings.mutateAsync({
        allowDownloads: draft.allowDownloads,
        watermarkPreviewImages: draft.watermarkPreviewImages,
        watermarkUrl: draft.watermarkUrl,
        hideOriginalFileNames: draft.hideOriginalFileNames,
        passwordProtected: draft.passwordProtected,
        password: draft.passwordProtected ? draft.password : null,
        expiresAt: draft.expiresAt || null
      });
      setSaved(true);
    } catch {
      setSaveError(
        t(
          "Could not save settings. Please try again.",
          "تعذر حفظ الإعدادات. يرجى المحاولة مرة أخرى."
        )
      );
    }
  };

  return (
    <div className="mt-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="divide-y divide-line rounded-lg border border-line bg-white px-5">
          <Toggle
            label={t("Allow downloads", "السماح بالتنزيل")}
            description={t(
              "Clients can download their photos and videos.",
              "يمكن للعملاء تنزيل الصور والفيديوهات الخاصة بهم."
            )}
            checked={draft.allowDownloads}
            onChange={(checked) => setDraft({ ...draft, allowDownloads: checked })}
          />
          <Toggle
            label={t("Watermark preview images", "إضافة علامة مائية للمعاينات")}
            description={t(
              "Overlay a watermark on gallery previews.",
              "عرض علامة مائية فوق معاينات المعرض."
            )}
            checked={draft.watermarkPreviewImages}
            onChange={(checked) => setDraft({ ...draft, watermarkPreviewImages: checked })}
          />
          <Toggle
            label={t("Hide original file names", "إخفاء أسماء الملفات الأصلية")}
            description={t(
              "Show generic file names instead of the originals.",
              "عرض أسماء عامة بدلا من الأسماء الأصلية."
            )}
            checked={draft.hideOriginalFileNames}
            onChange={(checked) => setDraft({ ...draft, hideOriginalFileNames: checked })}
          />
          <Toggle
            label={t("Password protect gallery", "حماية المعرض بكلمة مرور")}
            description={t(
              "Require a password before clients can view this gallery.",
              "طلب كلمة مرور قبل أن يتمكن العملاء من مشاهدة المعرض."
            )}
            checked={draft.passwordProtected}
            onChange={(checked) => setDraft({ ...draft, passwordProtected: checked })}
          />
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="watermark-upload"
              className="tracking-nav mb-2 block text-xs font-medium uppercase text-secondary"
            >
              {t("Watermark image", "صورة العلامة المائية")}
            </label>
            <input
              id="watermark-upload"
              type="file"
              accept="image/png,image/svg+xml,image/webp,image/jpeg"
              disabled={uploadWatermark.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void uploadWatermark
                  .mutateAsync(file)
                  .then((asset) => setDraft((current) => current ? { ...current, watermarkUrl: asset.assetUrl } : current));
              }}
              className="w-full rounded-md border border-line bg-base px-3.5 py-2.5 text-sm text-primary file:me-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-base disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="mt-2 text-xs text-secondary">
              {t(
                "Upload a transparent PNG, SVG, WebP, or JPG. Save settings to apply it to previews.",
                "ارفع ملف PNG أو SVG أو WebP أو JPG، ثم احفظ الإعدادات لتطبيقه على المعاينات."
              )}
            </p>
            {uploadWatermark.isError ? (
              <p className="mt-2 text-xs text-danger">
                {t("Could not upload watermark. Please try again.", "تعذر رفع العلامة المائية. حاول مرة أخرى.")}
              </p>
            ) : null}
            {draft.watermarkUrl ? (
              <div className="mt-3 flex items-center gap-3">
                <span className="flex h-16 w-28 items-center justify-center rounded-md border border-line bg-base p-2">
                  <img src={draft.watermarkUrl} alt="Watermark preview" className="max-h-full max-w-full object-contain" />
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDraft({ ...draft, watermarkUrl: null })}
                >
                  {t("Remove watermark", "إزالة العلامة المائية")}
                </Button>
              </div>
            ) : null}
          </div>
          {draft.passwordProtected ? (
            <TextField
              label={t("Gallery password", "كلمة مرور المعرض")}
              type="text"
              value={draft.password ?? ""}
              onChange={(event) => setDraft({ ...draft, password: event.target.value })}
              placeholder={t("Enter a password", "أدخل كلمة مرور")}
            />
          ) : null}
          <FancyDatePicker
            label={t("Gallery expiration date", "تاريخ انتهاء المعرض")}
            value={draft.expiresAt?.slice(0, 10) ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, expiresAt: event.target.value ? event.target.value : null })
            }
          />
          {saveError ? <p className="text-sm text-danger">{saveError}</p> : null}
          {saved && !updateSettings.isPending ? (
            <p className="text-sm text-success">{t("Settings saved.", "تم حفظ الإعدادات.")}</p>
          ) : null}
          <Button
            type="button"
            onClick={() => void handleSave()}
            loading={updateSettings.isPending}
            className="bg-accent text-white hover:bg-primary"
          >
            <ShieldIcon className="h-4 w-4" />
            {t("Save gallery settings", "حفظ إعدادات المعرض")}
          </Button>
        </div>
      </div>
    </div>
  );
}
