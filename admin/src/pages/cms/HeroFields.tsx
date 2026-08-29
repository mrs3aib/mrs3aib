import { TextField } from "@/components/TextField";
import { HeroMediaPicker } from "@/components/HeroMediaPicker";
import { useLanguage } from "@/i18n/languageContext";
import {
  sectionDraftFor,
  type CmsHero,
  type CmsHeroText,
  type CmsLocale
} from "@/types/pageContent";

/**
 * Text fields for a hero section.
 *
 * The homepage hero and the category hero render different subsets of `CmsHero`
 * on the public site, so `variant` controls which fields are offered. Showing a
 * field the site ignores would let an admin type copy that never appears.
 *
 *   home     → studio, wordmark, title, cta, ctaSecondary   (components/Hero.tsx)
 *   category → kicker, title, subtitle, cta                 (components/CategoryDetail.tsx)
 *
 * Media is picked here too when `pageKey` is given — image or video, by upload,
 * gallery pick, or URL. Without it only the text fields render, which is how a
 * caller that has no asset folder to write into opts out.
 */
export function HeroFields({
  value,
  onChange,
  variant = "home",
  locale,
  pageKey,
  onCommitMedia
}: {
  value: CmsHero;
  onChange: (next: CmsHero) => void;
  variant?: "home" | "category";
  /** Which language tab the text fields are editing. */
  locale: CmsLocale;
  /** Enables the media picker, and names the asset folder it writes to. */
  pageKey?: string;
  /** Saves a just-uploaded hero so the file is never stranded in the bucket. */
  onCommitMedia?: (next: CmsHero, replacedKey?: string) => Promise<void>;
}) {
  const { t } = useLanguage();
  const set = (patch: Partial<CmsHero>) => onChange({ ...value, ...patch });

  // Text for the language tab in view; media stays shared below.
  const text = sectionDraftFor(value, "hero", locale);
  const setText = (patch: Partial<CmsHeroText>) =>
    onChange({
      ...value,
      text: { ...value.text, [locale]: { ...text, ...patch } }
    });
  const tr = (label: string) => `${label} · ${locale.toUpperCase()}`;

  return (
    <>
      {variant === "home" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label={tr(t("Studio name (small title)", "اسم الاستوديو (العنوان الصغير)"))}
            value={text.studio ?? ""}
            onChange={(e) => setText({ studio: e.target.value })}
          />
          <TextField
            label={tr(t("Wordmark", "الشعار النصي"))}
            value={text.wordmark ?? ""}
            onChange={(e) => setText({ wordmark: e.target.value })}
          />
        </div>
      ) : (
        <TextField
          label={tr(t("Kicker", "العنوان التمهيدي"))}
          value={text.kicker ?? ""}
          onChange={(e) => setText({ kicker: e.target.value })}
        />
      )}

      <TextField
        label={tr(t("Main title", "العنوان الرئيسي"))}
        value={text.title ?? ""}
        onChange={(e) => setText({ title: e.target.value })}
      />

      {variant === "category" ? (
        <TextField
          label={tr(t("Subtitle", "النص التمهيدي"))}
          value={text.subtitle ?? ""}
          onChange={(e) => setText({ subtitle: e.target.value })}
        />
      ) : null}

      {variant === "home" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label={tr(t("Primary button", "الزر الأساسي"))}
            value={text.cta ?? ""}
            onChange={(e) => setText({ cta: e.target.value })}
          />
          <TextField
            label={tr(t("Secondary button", "الزر الثانوي"))}
            value={text.ctaSecondary ?? ""}
            onChange={(e) => setText({ ctaSecondary: e.target.value })}
          />
        </div>
      ) : (
        <TextField
          label={tr(t("Call-to-action button", "نص زر الدعوة (CTA)"))}
          value={text.cta ?? ""}
          onChange={(e) => setText({ cta: e.target.value })}
        />
      )}

      {pageKey ? (
        <HeroMediaPicker
          pageKey={pageKey}
          value={value}
          onChange={onChange}
          onCommit={onCommitMedia}
        />
      ) : (
        <>
          <TextField
            label={`${t("Hero media URL", "رابط وسائط البطل")} · ${t("ALL", "الكل")}`}
            value={value.mediaUrl ?? ""}
            onChange={(e) => set({ mediaUrl: e.target.value })}
            placeholder="https://..."
          />
          <p className="-mt-2 text-xs text-secondary">
            {t(
              "Leave blank to use the site's built-in visuals. Upload media from the page editor.",
              "اتركه فارغًا لاستخدام صور الموقع الافتراضية. ارفع الوسائط من محرر الصفحة."
            )}
          </p>
        </>
      )}
    </>
  );
}
