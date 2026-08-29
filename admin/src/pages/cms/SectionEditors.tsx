import { useState } from "react";
import { TextField } from "@/components/TextField";
import { TextareaField } from "@/components/TextareaField";
import { SelectField } from "@/components/SelectField";
import { Repeater } from "@/components/Repeater";
import { CheckIcon, CloseIcon } from "@/components/icons";
import { useLanguage } from "@/i18n/languageContext";
import { SessionPicker } from "./SessionPicker";
import {
  CMS_LOCALES,
  DEFAULT_CMS_LOCALE,
  FOOTER_TEXT_FIELDS,
  LATEST_WEDDINGS_DEFAULT_COUNT,
  WEDDINGS_CATEGORY_ID,
  footerTranslationStatus,
  sectionDraftFor,
  type CmsFooter,
  type CmsFooterText,
  type CmsLocale,
  type HomepageCmsContent,
  type LatestWeddingsMode,
  type TranslatableSection
} from "@/types/pageContent";

/**
 * Editors for the homepage sections below the hero.
 *
 * Every field is optional by design: the public site falls back to its
 * translated copy whenever a value is blank, so an empty form means "keep the
 * built-in text", not "render nothing". That is why nothing here is required.
 */

type SectionProps<K extends keyof HomepageCmsContent> = {
  value: NonNullable<HomepageCmsContent[K]>;
  onChange: (next: NonNullable<HomepageCmsContent[K]>) => void;
  /** Which language tab the translatable fields are editing. */
  locale: CmsLocale;
};

/**
 * Wires a section's translatable fields to the language tab in view.
 *
 * Returns the draft text for that locale plus a setter that writes back into
 * `text[locale]`, so shared keys on the section (media, links, arrays) are
 * never touched.
 */
function useLocalizedSection<K extends TranslatableSection>(
  value: object,
  onChange: (next: never) => void,
  sectionKey: K,
  locale: CmsLocale
) {
  const text = sectionDraftFor(value, sectionKey, locale);

  const setText = (patch: Record<string, string>) =>
    (onChange as (next: object) => void)({
      ...value,
      text: {
        ...(value as { text?: Record<string, unknown> }).text,
        [locale]: { ...text, ...patch }
      }
    });

  /** Appends the language marker to a field label. */
  const tr = (label: string) => `${label} · ${locale.toUpperCase()}`;

  return { text, setText, tr };
}

/** Marks a label as shared across every language. */
function sharedLabel(label: string, allWord: string) {
  return `${label} · ${allWord}`;
}

/** Wraps each section so the page reads as a list of collapsible groups. */
export function SectionCard({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-lg border border-line bg-card p-5 [&[open]>summary]:mb-4">
      <summary className="cursor-pointer list-none">
        <span className="tracking-title block font-display text-lg font-semibold text-primary">
          {title}
        </span>
        <span className="mt-0.5 block text-sm text-secondary">{description}</span>
      </summary>
      <div className="grid gap-4">{children}</div>
    </details>
  );
}

export function AboutEditor({ value, onChange, locale }: SectionProps<"about">) {
  const { t } = useLanguage();
  const { text, setText, tr } = useLocalizedSection(value, onChange, "about", locale);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label={tr(t("Label", "التسمية"))}
          value={text.label ?? ""}
          onChange={(e) => setText({ label: e.target.value })}
        />
        <TextField
          label={tr(t("Title", "العنوان"))}
          value={text.title ?? ""}
          onChange={(e) => setText({ title: e.target.value })}
        />
      </div>
      <TextareaField
        label={tr(t("Body", "النص"))}
        rows={5}
        value={text.body ?? ""}
        onChange={(e) => setText({ body: e.target.value })}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label={tr(t("Button text", "نص الزر"))}
          value={text.cta ?? ""}
          onChange={(e) => setText({ cta: e.target.value })}
        />
        <TextField
          label={sharedLabel(t("Image URL", "رابط الصورة"), t("ALL", "الكل"))}
          value={value.imageUrl ?? ""}
          onChange={(e) => onChange({ ...value, imageUrl: e.target.value })}
          placeholder="/images/about.png or https://..."
        />
      </div>
    </>
  );
}

export function GalleryEditor({ value, onChange, locale }: SectionProps<"gallery">) {
  const { t } = useLanguage();
  const { text, setText, tr } = useLocalizedSection(value, onChange, "gallery", locale);
  const sessionIds = value.sessionIds ?? [];

  return (
    <>
      <TextField
        label={tr(t("Title", "العنوان"))}
        value={text.title ?? ""}
        onChange={(e) => setText({ title: e.target.value })}
      />

      <div>
        <span className="tracking-nav mb-2 block text-xs font-medium uppercase text-secondary">
          {t("Choose from published sessions", "اختر من الجلسات المنشورة")}
        </span>
        <p className="mb-2 text-xs text-secondary">
          {t(
            "Pick published work from any category. Selected sessions replace the manual images below, and always show their current cover.",
            "اختر أعمالًا منشورة من أي تصنيف. الجلسات المحددة تحل محل الصور اليدوية أدناه، وتعرض دائمًا غلافها الحالي."
          )}
        </p>
        <SessionPicker
          selected={sessionIds}
          onChange={(next) => onChange({ ...value, sessionIds: next })}
        />
      </div>

      {sessionIds.length > 0 ? (
        <p className="rounded-md border border-line bg-base/60 px-3 py-2 text-xs text-secondary">
          {t(
            "The manual images below are ignored while sessions are selected. Clear the selection to use them again.",
            "يتم تجاهل الصور اليدوية أدناه أثناء تحديد الجلسات. امسح التحديد لاستخدامها مرة أخرى."
          )}
        </p>
      ) : null}

      <Repeater
        label={t("Gallery items", "عناصر المعرض")}
        items={value.items ?? []}
        onChange={(items) => onChange({ ...value, items })}
        createItem={() => ({ imageUrl: "", title: "", category: "" })}
        addLabel={t("Add image", "إضافة صورة")}
        emptyHint={t(
          "No images yet — the site will show its default gallery.",
          "لا توجد صور بعد — سيعرض الموقع معرضه الافتراضي."
        )}
        renderItem={(item, index, update) => (
          <div className="grid gap-3">
            <TextField
              label={t("Image URL", "رابط الصورة")}
              name={`gallery-image-${index}`}
              value={item.imageUrl}
              onChange={(e) => update({ ...item, imageUrl: e.target.value })}
              placeholder="https://..."
            />
            <div className="grid gap-3 md:grid-cols-2">
              <TextField
                label={t("Title", "العنوان")}
                name={`gallery-title-${index}`}
                value={item.title ?? ""}
                onChange={(e) => update({ ...item, title: e.target.value })}
              />
              <TextField
                label={t("Category", "التصنيف")}
                name={`gallery-category-${index}`}
                value={item.category ?? ""}
                onChange={(e) => update({ ...item, category: e.target.value })}
              />
            </div>
          </div>
        )}
      />
    </>
  );
}

/**
 * Editor for the weddings showcase below the hero.
 *
 * Auto mode is the default and needs no upkeep — the site tracks the newest
 * published wedding sessions itself. Manual mode is the escape hatch for when the
 * newest work is not the work worth leading with.
 */
export function LatestWeddingsEditor({
  value,
  onChange,
  locale
}: SectionProps<"latestWeddings">) {
  const { t } = useLanguage();
  const { text, setText, tr } = useLocalizedSection(
    value,
    onChange,
    "latestWeddings",
    locale
  );
  const mode: LatestWeddingsMode = value.mode ?? "auto";
  const count = value.count ?? LATEST_WEDDINGS_DEFAULT_COUNT;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label={tr(t("Label", "التسمية"))}
          value={text.label ?? ""}
          onChange={(e) => setText({ label: e.target.value })}
        />
        <TextField
          label={tr(t("Title", "العنوان"))}
          value={text.title ?? ""}
          onChange={(e) => setText({ title: e.target.value })}
        />
      </div>
      <TextareaField
        label={tr(t("Subtitle", "العنوان الفرعي"))}
        rows={2}
        value={text.subtitle ?? ""}
        onChange={(e) => setText({ subtitle: e.target.value })}
      />

      <div className="rounded-md border border-line p-3">
        <span className="tracking-nav mb-3 block text-xs font-medium uppercase text-secondary">
          {sharedLabel(t("Which weddings to show", "الزواجات المعروضة"), t("ALL", "الكل"))}
        </span>

        <div className="grid gap-2">
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-primary">
            <input
              type="radio"
              name="latest-weddings-mode"
              checked={mode === "auto"}
              onChange={() => onChange({ ...value, mode: "auto" })}
              className="mt-1 h-4 w-4 shrink-0 accent-[#171b24]"
            />
            <span>
              {t("Automatic — newest weddings", "تلقائي — أحدث الزواجات")}
              <span className="block text-xs text-secondary">
                {t(
                  "Always shows the most recent published wedding sessions. Nothing to maintain.",
                  "يعرض دائمًا أحدث جلسات الزواجات المنشورة. لا يحتاج إلى صيانة."
                )}
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-primary">
            <input
              type="radio"
              name="latest-weddings-mode"
              checked={mode === "manual"}
              onChange={() => onChange({ ...value, mode: "manual" })}
              className="mt-1 h-4 w-4 shrink-0 accent-[#171b24]"
            />
            <span>
              {t("Manual — choose specific weddings", "يدوي — اختر زواجات محددة")}
              <span className="block text-xs text-secondary">
                {t(
                  "Pick exactly which weddings appear, and in what order.",
                  "اختر بالضبط الزواجات التي تظهر وترتيبها."
                )}
              </span>
            </span>
          </label>
        </div>

        {mode === "auto" ? (
          <div className="mt-4 max-w-48">
            <SelectField
              label={t("How many to show", "عدد العناصر المعروضة")}
              value={String(count)}
              onChange={(e) =>
                onChange({ ...value, count: Number(e.target.value) })
              }
            >
              {[3, 4, 6, 8].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectField>
          </div>
        ) : (
          <div className="mt-4">
            <SessionPicker
              selected={value.sessionIds ?? []}
              onChange={(next) => onChange({ ...value, sessionIds: next })}
              lockedCategory={WEDDINGS_CATEGORY_ID}
            />
          </div>
        )}
      </div>
    </>
  );
}

export function StoryEditor({ value, onChange, locale }: SectionProps<"story">) {
  const images = value.images ?? [];
  const { t } = useLanguage();
  const { text, setText, tr } = useLocalizedSection(value, onChange, "story", locale);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label={tr(t("Label", "التسمية"))}
          value={text.label ?? ""}
          onChange={(e) => setText({ label: e.target.value })}
        />
        <TextField
          label={tr(t("Title", "العنوان"))}
          value={text.title ?? ""}
          onChange={(e) => setText({ title: e.target.value })}
        />
      </div>
      <TextareaField
        label={tr(t("Intro", "المقدمة"))}
        value={text.intro ?? ""}
        onChange={(e) => setText({ intro: e.target.value })}
      />

      {/* The story layout is a fixed three-image composition, so anything other
          than exactly three is ignored by the site and falls back to defaults. */}
      <Repeater
        label={t("Images (exactly 3 to take effect)", "الصور (3 بالضبط ليتم تطبيقها)")}
        items={images}
        onChange={(next) => onChange({ ...value, images: next })}
        createItem={() => ""}
        addLabel={t("Add image", "إضافة صورة")}
        maxItems={3}
        emptyHint={t(
          "Add three images to override the default story visuals.",
          "أضف ثلاث صور لاستبدال صور القصة الافتراضية."
        )}
        renderItem={(item, index, update) => (
          <TextField
            label={t("Image URL", "رابط الصورة")}
            name={`story-image-${index}`}
            value={item}
            onChange={(e) => update(e.target.value)}
            placeholder="https://..."
          />
        )}
      />
      {images.length > 0 && images.length !== 3 ? (
        <p className="text-xs text-danger">
          {t(
            `${images.length} of 3 images set — the site uses its default images until all three are provided.`,
            `تم تعيين ${images.length} من 3 صور — سيستخدم الموقع صوره الافتراضية حتى يتم توفير الثلاث صور.`
          )}
        </p>
      ) : null}

      <Repeater
        label={t("Chapters", "الفصول")}
        items={value.chapters ?? []}
        onChange={(chapters) => onChange({ ...value, chapters })}
        createItem={() => ({ number: "", title: "", text: "" })}
        addLabel={t("Add chapter", "إضافة فصل")}
        renderItem={(item, index, update) => (
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-[8rem_1fr]">
              <TextField
                label={t("Number", "الرقم")}
                name={`story-chapter-number-${index}`}
                value={item.number ?? ""}
                onChange={(e) => update({ ...item, number: e.target.value })}
              />
              <TextField
                label={t("Title", "العنوان")}
                name={`story-chapter-title-${index}`}
                value={item.title ?? ""}
                onChange={(e) => update({ ...item, title: e.target.value })}
              />
            </div>
            <TextareaField
              label={t("Text", "النص")}
              name={`story-chapter-text-${index}`}
              value={item.text ?? ""}
              onChange={(e) => update({ ...item, text: e.target.value })}
            />
          </div>
        )}
      />
    </>
  );
}

export function ProcessEditor({ value, onChange, locale }: SectionProps<"process">) {
  const { t } = useLanguage();
  const { text, setText, tr } = useLocalizedSection(value, onChange, "process", locale);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label={tr(t("Label", "التسمية"))}
          value={text.label ?? ""}
          onChange={(e) => setText({ label: e.target.value })}
        />
        <TextField
          label={tr(t("Title", "العنوان"))}
          value={text.title ?? ""}
          onChange={(e) => setText({ title: e.target.value })}
        />
      </div>
      <Repeater
        label={t("Steps", "الخطوات")}
        items={value.steps ?? []}
        onChange={(steps) => onChange({ ...value, steps })}
        createItem={() => ({ number: "", title: "", text: "" })}
        addLabel={t("Add step", "إضافة خطوة")}
        renderItem={(item, index, update) => (
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-[8rem_1fr]">
              <TextField
                label={t("Number", "الرقم")}
                name={`process-number-${index}`}
                value={item.number ?? ""}
                onChange={(e) => update({ ...item, number: e.target.value })}
              />
              <TextField
                label={t("Title", "العنوان")}
                name={`process-title-${index}`}
                value={item.title ?? ""}
                onChange={(e) => update({ ...item, title: e.target.value })}
              />
            </div>
            <TextareaField
              label={t("Text", "النص")}
              name={`process-text-${index}`}
              value={item.text ?? ""}
              onChange={(e) => update({ ...item, text: e.target.value })}
            />
          </div>
        )}
      />
    </>
  );
}

export function TestimonialsEditor({
  value,
  onChange,
  locale
}: SectionProps<"testimonials">) {
  const { t } = useLanguage();
  const { text, setText, tr } = useLocalizedSection(
    value,
    onChange,
    "testimonials",
    locale
  );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label={tr(t("Label", "التسمية"))}
          value={text.label ?? ""}
          onChange={(e) => setText({ label: e.target.value })}
        />
        <TextField
          label={tr(t("Title", "العنوان"))}
          value={text.title ?? ""}
          onChange={(e) => setText({ title: e.target.value })}
        />
      </div>
      <Repeater
        label={t("Testimonials", "آراء العملاء")}
        items={value.items ?? []}
        onChange={(items) => onChange({ ...value, items })}
        createItem={() => ({ quote: "", name: "", role: "" })}
        addLabel={t("Add testimonial", "إضافة رأي")}
        renderItem={(item, index, update) => (
          <div className="grid gap-3">
            <TextareaField
              label={t("Quote", "الاقتباس")}
              name={`testimonial-quote-${index}`}
              value={item.quote ?? ""}
              onChange={(e) => update({ ...item, quote: e.target.value })}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <TextField
                label={t("Name", "الاسم")}
                name={`testimonial-name-${index}`}
                value={item.name ?? ""}
                onChange={(e) => update({ ...item, name: e.target.value })}
              />
              <TextField
                label={t("Role", "الصفة")}
                name={`testimonial-role-${index}`}
                value={item.role ?? ""}
                onChange={(e) => update({ ...item, role: e.target.value })}
              />
            </div>
          </div>
        )}
      />
    </>
  );
}

export function InstagramEditor({ value, onChange, locale }: SectionProps<"instagram">) {
  const { t } = useLanguage();
  const { text, setText, tr } = useLocalizedSection(value, onChange, "instagram", locale);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label={tr(t("Label", "التسمية"))}
          value={text.label ?? ""}
          onChange={(e) => setText({ label: e.target.value })}
        />
        <TextField
          label={tr(t("Title", "العنوان"))}
          value={text.title ?? ""}
          onChange={(e) => setText({ title: e.target.value })}
        />
      </div>
      <TextareaField
        label={tr(t("Subtitle", "العنوان الفرعي"))}
        value={text.subtitle ?? ""}
        onChange={(e) => setText({ subtitle: e.target.value })}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label={tr(t("Follow button text", "نص زر المتابعة"))}
          value={text.follow ?? ""}
          onChange={(e) => setText({ follow: e.target.value })}
        />
        <TextField
          label={sharedLabel(t("Profile URL", "رابط الملف الشخصي"), t("ALL", "الكل"))}
          value={value.url ?? ""}
          onChange={(e) => onChange({ ...value, url: e.target.value })}
          placeholder="https://instagram.com/yourhandle"
        />
      </div>
      <Repeater
        label={t("Images", "الصور")}
        items={value.images ?? []}
        onChange={(next) => onChange({ ...value, images: next })}
        createItem={() => ""}
        addLabel={t("Add image", "إضافة صورة")}
        emptyHint={t(
          "No images yet — the site will show its default feed.",
          "لا توجد صور بعد — سيعرض الموقع سجله الافتراضي."
        )}
        renderItem={(item, index, update) => (
          <TextField
            label={t("Image URL", "رابط الصورة")}
            name={`instagram-image-${index}`}
            value={item}
            onChange={(e) => update(e.target.value)}
            placeholder="https://..."
          />
        )}
      />
    </>
  );
}

export function ContactEditor({ value, onChange, locale }: SectionProps<"contact">) {
  const { t } = useLanguage();
  const { text, setText, tr } = useLocalizedSection(value, onChange, "contact", locale);
  const all = t("ALL", "الكل");

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label={tr(t("Label", "التسمية"))}
          value={text.label ?? ""}
          onChange={(e) => setText({ label: e.target.value })}
        />
        <TextField
          label={tr(t("Title", "العنوان"))}
          value={text.title ?? ""}
          onChange={(e) => setText({ title: e.target.value })}
        />
      </div>
      <TextareaField
        label={tr(t("Subtitle", "العنوان الفرعي"))}
        value={text.subtitle ?? ""}
        onChange={(e) => setText({ subtitle: e.target.value })}
      />
      <TextField
        label={tr(t("Book button text", "نص زر الحجز"))}
        value={text.book ?? ""}
        onChange={(e) => setText({ book: e.target.value })}
      />

      <TextField
        label={sharedLabel(t("Email", "البريد الإلكتروني"), all)}
        type="email"
        value={value.email ?? ""}
        onChange={(e) => onChange({ ...value, email: e.target.value })}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label={sharedLabel(t("Instagram handle", "معرف إنستغرام"), all)}
          value={value.instagram ?? ""}
          onChange={(e) => onChange({ ...value, instagram: e.target.value })}
          placeholder="@yourhandle"
        />
        <TextField
          label={sharedLabel(t("Instagram link", "رابط إنستغرام"), all)}
          value={value.instagramUrl ?? ""}
          onChange={(e) => onChange({ ...value, instagramUrl: e.target.value })}
          placeholder="https://instagram.com/yourhandle"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label={sharedLabel(t("WhatsApp number", "رقم واتساب"), all)}
          value={value.whatsapp ?? ""}
          onChange={(e) => onChange({ ...value, whatsapp: e.target.value })}
        />
        <TextField
          label={sharedLabel(t("WhatsApp link", "رابط واتساب"), all)}
          value={value.whatsappUrl ?? ""}
          onChange={(e) => onChange({ ...value, whatsappUrl: e.target.value })}
          placeholder="https://wa.me/..."
        />
      </div>
    </>
  );
}

/**
 * Language tabs with a per-locale completion badge.
 *
 * The badge answers "is this language done?" at a glance: ✓ when every text
 * field is filled, ✗ when none are, and `n/total` in between — a partial
 * translation must not look finished.
 */
export function LanguageTabs({
  active,
  onChange,
  statusFor
}: {
  active: CmsLocale;
  onChange: (locale: CmsLocale) => void;
  statusFor: (locale: CmsLocale) => {
    filled: number;
    total: number;
    complete: boolean;
    empty: boolean;
  };
}) {
  const { t } = useLanguage();
  const names: Record<CmsLocale, string> = { en: "English", ar: "العربية" };

  return (
    <div className="flex gap-2 border-b border-line">
      {CMS_LOCALES.map((locale) => {
        const status = statusFor(locale);
        const isActive = locale === active;

        return (
          <button
            key={locale}
            type="button"
            onClick={() => onChange(locale)}
            aria-current={isActive}
            className={`-mb-px flex h-11 items-center gap-2 whitespace-nowrap border-b-2 px-5 text-sm transition-colors ${
              isActive
                ? "border-accent font-medium text-primary"
                : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            <span dir={locale === "ar" ? "rtl" : "ltr"}>{names[locale]}</span>

            {status.complete ? (
              <span
                title={t("All fields translated", "تمت ترجمة جميع الحقول")}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-success"
              >
                <CheckIcon className="h-3.5 w-3.5" />
              </span>
            ) : status.empty ? (
              <span
                title={t("Nothing translated yet", "لا توجد ترجمة بعد")}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-danger/15 text-danger"
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </span>
            ) : (
              <span
                title={t("Partly translated", "مترجم جزئيًا")}
                className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                dir="ltr"
              >
                {status.filled}/{status.total}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The footer owns its own language tabs — it is edited on a page of its own
 * rather than alongside the homepage sections, so it takes no `locale` prop.
 */
export function FooterEditor({
  value,
  onChange
}: Omit<SectionProps<"footer">, "locale">) {
  const { t } = useLanguage();
  const social = value.social ?? {};
  const [locale, setLocale] = useState<CmsLocale>(DEFAULT_CMS_LOCALE);

  /**
   * Marks a label as belonging to the language tab in view.
   *
   * `label` is a plain string on TextField/TextareaField, so the marker is part
   * of the text rather than a styled element — which also keeps it readable to
   * a screen reader announcing the field.
   */
  const tr = (label: string) => `${label} · ${locale.toUpperCase()}`;

  // Text for the tab being edited. Falls back to the flat legacy fields on the
  // English tab so a pre-translation record opens with its existing copy rather
  // than blank, and that copy is written into `text.en` on the next save.
  const text: CmsFooterText = {
    ...(locale === "en" ? legacyFooterText(value) : {}),
    ...(value.text?.[locale] ?? {})
  };

  const setText = (patch: Partial<CmsFooterText>) =>
    onChange({
      ...value,
      text: { ...value.text, [locale]: { ...text, ...patch } }
    });

  return (
    <>
      <LanguageTabs
        active={locale}
        onChange={setLocale}
        statusFor={(l) => footerTranslationStatus(value, l)}
      />

      <p className="text-xs text-secondary">
        {t(
          `Fields marked · ${locale.toUpperCase()} are saved for this language only. Fields marked · ALL are shared across both.`,
          `الحقول المعلَّمة بـ · ${locale.toUpperCase()} تُحفظ لهذه اللغة فقط. الحقول المعلَّمة بـ · الكل مشتركة بين اللغتين.`
        )}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label={tr(t("Newsletter title", "عنوان النشرة البريدية"))}
          value={text.newsletterTitle ?? ""}
          onChange={(e) => setText({ newsletterTitle: e.target.value })}
        />
        <TextField
          label={tr(t("Quick links title", "عنوان الروابط السريعة"))}
          value={text.quickLinks ?? ""}
          onChange={(e) => setText({ quickLinks: e.target.value })}
        />
      </div>
      <TextareaField
        label={tr(t("Newsletter text", "نص النشرة البريدية"))}
        value={text.newsletterText ?? ""}
        onChange={(e) => setText({ newsletterText: e.target.value })}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label={tr(t("Contact title", "عنوان التواصل"))}
          value={text.contactTitle ?? ""}
          onChange={(e) => setText({ contactTitle: e.target.value })}
        />
        <TextField
          label={tr(t("Location", "الموقع"))}
          value={text.location ?? ""}
          onChange={(e) => setText({ location: e.target.value })}
        />
      </div>

      <TextField
        label={tr(t("Follow title", "عنوان المتابعة"))}
        value={text.followTitle ?? ""}
        onChange={(e) => setText({ followTitle: e.target.value })}
      />

      <div className="rounded-md border border-line p-3">
        <span className="tracking-nav mb-3 block text-xs font-medium uppercase text-secondary">
          {t("Shared across languages", "مشترك بين اللغتين")}
        </span>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label={`${t("Phone", "الهاتف")} · ${t("ALL", "الكل")}`}
            value={value.phone ?? ""}
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
            placeholder="+966 55 123 4567"
          />
          <TextField
            label={`${t("Email", "البريد الإلكتروني")} · ${t("ALL", "الكل")}`}
            type="email"
            value={value.email ?? ""}
            onChange={(e) => onChange({ ...value, email: e.target.value })}
          />
        </div>
      </div>

      <SocialLinksEditor value={social} onChange={(next) => onChange({ ...value, social: next })} />
    </>
  );
}

/** The pre-translation flat fields, used to seed the English tab once. */
function legacyFooterText(footer: CmsFooter): CmsFooterText {
  return Object.fromEntries(
    FOOTER_TEXT_FIELDS.filter((field) => footer[field]?.trim()).map((field) => [
      field,
      footer[field]
    ])
  );
}

type SocialLinks = NonNullable<NonNullable<HomepageCmsContent["footer"]>["social"]>;
type SocialKey = keyof SocialLinks;

/**
 * The platforms the footer can render, in the order the site draws them.
 * Adding one here requires a matching icon in web/components/Footer.tsx.
 */
const SOCIAL_PLATFORMS: {
  key: SocialKey;
  labelEn: string;
  labelAr: string;
  placeholder: string;
}[] = [
  { key: "instagramUrl", labelEn: "Instagram", labelAr: "إنستغرام", placeholder: "https://instagram.com/yourhandle" },
  { key: "youtubeUrl", labelEn: "YouTube", labelAr: "يوتيوب", placeholder: "https://youtube.com/@yourchannel" },
  { key: "tiktokUrl", labelEn: "TikTok", labelAr: "تيك توك", placeholder: "https://tiktok.com/@yourhandle" },
  { key: "whatsappUrl", labelEn: "WhatsApp", labelAr: "واتساب", placeholder: "https://wa.me/966551234567" },
  { key: "telegramUrl", labelEn: "Telegram", labelAr: "تيليجرام", placeholder: "https://t.me/yourhandle" },
  { key: "snapchatUrl", labelEn: "Snapchat", labelAr: "سناب شات", placeholder: "https://snapchat.com/add/yourhandle" },
  { key: "twitterUrl", labelEn: "X (Twitter)", labelAr: "إكس (تويتر)", placeholder: "https://x.com/yourhandle" },
  { key: "linkedinUrl", labelEn: "LinkedIn", labelAr: "لينكد إن", placeholder: "https://linkedin.com/in/yourprofile" }
];

/**
 * Social links as an add-from-dropdown list rather than a fixed grid.
 *
 * Only platforms the admin actually uses take up space. A platform is "added"
 * when its key is present in `social`; removing deletes the key entirely, which
 * is also how the public footer decides not to draw the icon.
 *
 * The stored shape is unchanged — still one keyed object — so the site's icon
 * order stays fixed regardless of the order they were added here.
 */
function SocialLinksEditor({
  value,
  onChange
}: {
  value: SocialLinks;
  onChange: (next: SocialLinks) => void;
}) {
  const { t } = useLanguage();
  const [picked, setPicked] = useState<SocialKey | "">("");

  // A key that exists — even as an empty string — counts as added, so a newly
  // added row does not vanish before the admin has typed the URL.
  const added = SOCIAL_PLATFORMS.filter((p) => value[p.key] !== undefined);
  const available = SOCIAL_PLATFORMS.filter((p) => value[p.key] === undefined);

  const add = (key: SocialKey) => {
    onChange({ ...value, [key]: "" });
    setPicked("");
  };

  const remove = (key: SocialKey) => {
    const next = { ...value };
    delete next[key];
    onChange(next);
  };

  return (
    <div className="rounded-md border border-line p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="tracking-nav text-xs font-medium uppercase text-secondary">
          {t("Social links", "روابط التواصل")}
        </span>
        <span className="text-xs text-secondary">
          {added.length} / {SOCIAL_PLATFORMS.length}
        </span>
      </div>

      {added.length === 0 ? (
        <p className="mb-3 text-sm text-secondary">
          {t(
            "No social links yet — add the ones you use. Nothing is shown on the site until you add a link.",
            "لا توجد روابط تواصل بعد — أضف ما تستخدمه. لن يظهر شيء في الموقع حتى تضيف رابطًا."
          )}
        </p>
      ) : (
        <ul className="mb-3 grid gap-3">
          {added.map((platform) => (
            <li key={platform.key} className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <TextField
                  label={t(platform.labelEn, platform.labelAr)}
                  value={value[platform.key] ?? ""}
                  onChange={(e) => onChange({ ...value, [platform.key]: e.target.value })}
                  placeholder={platform.placeholder}
                />
              </div>
              <button
                type="button"
                onClick={() => remove(platform.key)}
                aria-label={t(
                  `Remove ${platform.labelEn}`,
                  `إزالة ${platform.labelAr}`
                )}
                className="mb-2.5 shrink-0 text-xs font-medium uppercase text-danger underline underline-offset-2"
              >
                {t("Remove", "إزالة")}
              </button>
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 ? (
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <SelectField
              label={t("Add a social link", "إضافة رابط تواصل")}
              value={picked}
              onChange={(e) => setPicked(e.target.value as SocialKey | "")}
            >
              <option value="">{t("Choose a platform...", "اختر منصة...")}</option>
              {available.map((platform) => (
                <option key={platform.key} value={platform.key}>
                  {t(platform.labelEn, platform.labelAr)}
                </option>
              ))}
            </SelectField>
          </div>
          <button
            type="button"
            onClick={() => picked && add(picked)}
            disabled={!picked}
            className="mb-0.5 h-10.5 shrink-0 rounded-md border border-line px-4 text-xs font-medium uppercase text-primary transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("Add", "إضافة")}
          </button>
        </div>
      ) : (
        <p className="text-xs text-secondary">
          {t("All platforms added.", "تمت إضافة جميع المنصات.")}
        </p>
      )}
    </div>
  );
}
