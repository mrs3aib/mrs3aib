import { useState } from "react";
import { TextField } from "@/components/TextField";
import { TextareaField } from "@/components/TextareaField";
import { SelectField } from "@/components/SelectField";
import { Repeater } from "@/components/Repeater";
import { ImageUploadField } from "@/components/ImageUploadField";
import { Modal } from "@/components/Modal";
import { CheckIcon, CloseIcon, SettingsIcon } from "@/components/icons";
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
  type StoryImageFit,
  type StoryImagePosition,
  type StoryImagePresentation,
  type StoryDescriptionTextStyle,
  type StoryTextSize,
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

const STORY_IMAGE_FIT_OPTIONS: { value: StoryImageFit; label: string; labelAr: string }[] = [
  { value: "cover", label: "Fill frame", labelAr: "ملء الإطار" },
  { value: "contain", label: "Show full image", labelAr: "إظهار الصورة كاملة" }
];

const STORY_IMAGE_POSITION_OPTIONS: {
  value: StoryImagePosition;
  label: string;
  labelAr: string;
}[] = [
  // Left/right here are physical, not reading-order: `object-position` has no
  // logical equivalent, so the crop lands on the same side of the photo in
  // both locales. Labelling these "start"/"end" implied they flipped with the
  // Arabic layout, so an admin framing a subject on the left picked "start"
  // and got the opposite edge cropped in one of the two languages.
  { value: "top left", label: "Top left", labelAr: "أعلى اليسار" },
  { value: "top", label: "Top", labelAr: "أعلى" },
  { value: "top right", label: "Top right", labelAr: "أعلى اليمين" },
  { value: "left", label: "Center left", labelAr: "منتصف اليسار" },
  { value: "center", label: "Center", labelAr: "المنتصف" },
  { value: "right", label: "Center right", labelAr: "منتصف اليمين" },
  { value: "bottom left", label: "Bottom left", labelAr: "أسفل اليسار" },
  { value: "bottom", label: "Bottom", labelAr: "أسفل" },
  { value: "bottom right", label: "Bottom right", labelAr: "أسفل اليمين" }
];

const STORY_DESCRIPTION_SIZE_OPTIONS: {
  value: StoryTextSize;
  label: string;
  labelAr: string;
}[] = [
  { value: "small", label: "Small", labelAr: "صغير" },
  { value: "medium", label: "Medium", labelAr: "متوسط" },
  { value: "large", label: "Large", labelAr: "كبير" }
];

/**
 * Object-position classes for the framing preview.
 *
 * Written out in full rather than built from the value, because Tailwind scans
 * source text for class names and would not find a string assembled at
 * runtime.
 */
const PREVIEW_POSITION_CLASS: Record<StoryImagePosition, string> = {
  center: "object-center",
  top: "object-top",
  bottom: "object-bottom",
  left: "object-left",
  right: "object-right",
  "top left": "object-left-top",
  "top right": "object-right-top",
  "bottom left": "object-left-bottom",
  "bottom right": "object-right-bottom"
};

function StoryImageSettingsModal({
  open,
  imageUrl,
  value,
  descriptionTextStyle,
  onChange,
  onDescriptionTextStyleChange,
  onClose
}: {
  open: boolean;
  imageUrl: string;
  value?: StoryImagePresentation;
  descriptionTextStyle?: StoryDescriptionTextStyle;
  onChange: (next: StoryImagePresentation) => void;
  onDescriptionTextStyleChange: (next: StoryDescriptionTextStyle) => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const update = (patch: Partial<StoryImagePresentation>) =>
    onChange({ ...value, ...patch });
  const mobileFit = value?.mobileFit ?? "cover";
  const desktopFit = value?.desktopFit ?? "cover";
  const mobilePosition = value?.mobilePosition ?? "center";
  const desktopPosition = value?.desktopPosition ?? "center";
  const mobileDescriptionSize = descriptionTextStyle?.mobileSize ?? "medium";
  const desktopDescriptionSize = descriptionTextStyle?.desktopSize ?? "medium";
  const updateDescriptionTextStyle = (patch: Partial<StoryDescriptionTextStyle>) =>
    onDescriptionTextStyleChange({ ...descriptionTextStyle, ...patch });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("Story image framing", "تنسيق صورة القصة")}
      panelClassName="max-w-3xl"
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="grid gap-3">
          {/*
            The preview mirrors the live section: a tall phone frame, the
            chosen fit and position actually applied, and the two bands that
            carry text shaded. Previously this was a fixed 4:3 `object-cover`
            thumbnail that ignored every setting in the panel, so the admin
            picked a focal position blind and only discovered the crop after
            publishing.
          */}
          <div className="overflow-hidden rounded-md border border-line bg-base">
            {imageUrl ? (
              <div className="relative mx-auto aspect-9/16 w-full max-w-[220px]">
                <img
                  src={imageUrl}
                  alt=""
                  className={`h-full w-full ${
                    mobileFit === "cover" ? "object-cover" : "object-contain"
                  } ${PREVIEW_POSITION_CLASS[mobilePosition]}`}
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 flex h-2/5 items-start bg-linear-to-b from-black/85 via-black/55 to-transparent p-2">
                  <span className="text-[10px] uppercase tracking-wide text-white/70">
                    {t("Heading area", "منطقة العنوان")}
                  </span>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-3/5 items-end bg-linear-to-t from-black/85 via-black/60 to-transparent p-2">
                  <span className="text-[10px] uppercase tracking-wide text-white/70">
                    {t("Chapter text area", "منطقة نص الفصل")}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex aspect-9/16 items-center justify-center px-5 text-center text-sm text-secondary">
                {t("Upload an image to preview its framing.", "ارفع صورة لمعاينة تنسيقها.")}
              </div>
            )}
          </div>
          <p className="text-xs leading-relaxed text-secondary">
            {t(
              "Phone preview. Upload a tall portrait photo (9:16, at least 1200×2133) with the subject in the middle — the shaded bands sit under the heading and the chapter text. A landscape photo will be cropped hard on phones.",
              "معاينة الجوال. ارفع صورة طولية (9:16، 1200×2133 على الأقل) مع وضع الموضوع في المنتصف — تقع المساحات المظللة أسفل العنوان ونص الفصل. الصورة العرضية سيتم قصها بشدة على الجوال."
            )}
          </p>
        </div>

        <div className="grid gap-5">
          <fieldset className="grid gap-3">
            <legend className="text-sm font-medium text-primary">
              {t("Mobile", "الجوال")}
            </legend>
            <SelectField
              label={t("Image size", "حجم الصورة")}
              value={mobileFit}
              onChange={(e) => update({ mobileFit: e.target.value as StoryImageFit })}
            >
              {STORY_IMAGE_FIT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.label, option.labelAr)}
                </option>
              ))}
            </SelectField>
            <SelectField
              label={t("Focal position", "موضع التركيز")}
              value={mobilePosition}
              onChange={(e) =>
                update({ mobilePosition: e.target.value as StoryImagePosition })
              }
            >
              {STORY_IMAGE_POSITION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.label, option.labelAr)}
                </option>
              ))}
            </SelectField>
          </fieldset>

          <fieldset className="grid gap-3 border-t border-line pt-5">
            <legend className="text-sm font-medium text-primary">
              {t("Desktop", "سطح المكتب")}
            </legend>
            <SelectField
              label={t("Image size", "حجم الصورة")}
              value={desktopFit}
              onChange={(e) => update({ desktopFit: e.target.value as StoryImageFit })}
            >
              {STORY_IMAGE_FIT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.label, option.labelAr)}
                </option>
              ))}
            </SelectField>
            <SelectField
              label={t("Focal position", "موضع التركيز")}
              value={desktopPosition}
              onChange={(e) =>
                update({ desktopPosition: e.target.value as StoryImagePosition })
              }
            >
              {STORY_IMAGE_POSITION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.label, option.labelAr)}
                </option>
              ))}
            </SelectField>
          </fieldset>

          <fieldset className="grid gap-3 border-t border-line pt-5">
            <legend className="text-sm font-medium text-primary">
              {t("Description text", "نص الوصف")}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label={t("Mobile size", "حجم الجوال")}
                value={mobileDescriptionSize}
                onChange={(e) =>
                  updateDescriptionTextStyle({
                    mobileSize: e.target.value as StoryTextSize
                  })
                }
              >
                {STORY_DESCRIPTION_SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.label, option.labelAr)}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label={t("Desktop size", "حجم سطح المكتب")}
                value={desktopDescriptionSize}
                onChange={(e) =>
                  updateDescriptionTextStyle({
                    desktopSize: e.target.value as StoryTextSize
                  })
                }
              >
                {STORY_DESCRIPTION_SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.label, option.labelAr)}
                  </option>
                ))}
              </SelectField>
            </div>
          </fieldset>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          {t("Done", "تم")}
        </button>
      </div>
    </Modal>
  );
}

export function StoryEditor({
  value,
  onChange,
  locale,
  pageKey
}: SectionProps<"story"> & {
  /** Asset folder story image uploads are written to. */
  pageKey: string;
}) {
  const { t } = useLanguage();
  /**
   * Images used to live in a separate three-item list. Content saved back then
   * still has them, so they seed the matching chapter's field by position and
   * are written onto the chapter the moment it is edited.
   */
  const legacyImages = value.images ?? [];
  const chapters = value.chapters ?? [];
  const [framingChapter, setFramingChapter] = useState<number | null>(null);

  /**
   * Chapter prose for the tab in view. The shared `chapters` entry supplies the
   * number and image; `chaptersText[locale]` supplies title and text, falling
   * back to the legacy shared fields so content authored before the split still
   * shows while it is being translated.
   */
  const chapterText = value.chaptersText?.[locale] ?? [];
  const chapterTextAt = (index: number) => ({
    title: chapterText[index]?.title ?? chapters[index]?.title ?? "",
    text: chapterText[index]?.text ?? chapters[index]?.text ?? ""
  });

  /** Write one chapter's prose into the tab's locale, leaving others untouched. */
  const setChapterText = (index: number, patch: { title?: string; text?: string }) => {
    const nextForLocale: { title: string; text: string }[] = chapters.map((_, i) =>
      chapterTextAt(i)
    );
    // `chapters` drives the length above, so this index exists whenever the
    // field being edited does; the fallback keeps the types honest regardless.
    const current = nextForLocale[index] ?? chapterTextAt(index);
    nextForLocale[index] = {
      title: patch.title ?? current.title,
      text: patch.text ?? current.text
    };
    onChange({
      ...value,
      chaptersText: { ...value.chaptersText, [locale]: nextForLocale }
    });
  };
  const { text, setText, tr } = useLocalizedSection(value, onChange, "story", locale);
  const framingItem = framingChapter === null ? undefined : chapters[framingChapter];
  const framingImage =
    framingChapter === null
      ? ""
      : framingItem?.image ?? legacyImages[framingChapter] ?? "";

  const updateImagePresentation = (next: StoryImagePresentation) => {
    if (framingChapter === null || !chapters[framingChapter]) return;
    onChange({
      ...value,
      chapters: chapters.map((chapter, index) =>
        index === framingChapter ? { ...chapter, imagePresentation: next } : chapter
      )
    });
  };
  const updateDescriptionTextStyle = (next: StoryDescriptionTextStyle) => {
    if (framingChapter === null || !chapters[framingChapter]) return;
    onChange({
      ...value,
      chapters: chapters.map((chapter, index) =>
        index === framingChapter ? { ...chapter, descriptionTextStyle: next } : chapter
      )
    });
  };

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


      {/* Each chapter carries its own background image: the site cross-fades
          from one chapter to the next, so image and copy belong together. */}
      <Repeater
        label={t("Chapters", "الفصول")}
        items={chapters}
        onChange={(next) => onChange({ ...value, chapters: next })}
        createItem={() => ({ number: "", title: "", text: "", image: "" })}
        addLabel={t("Add chapter", "إضافة فصل")}
        emptyHint={t(
          "Add chapters — each one has its own text and background image.",
          "أضف فصولاً — لكل فصل نصه وصورته الخلفية."
        )}
        renderItem={(item, index, update) => (
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-[8rem_1fr]">
              <TextField
                label={sharedLabel(t("Number", "الرقم"), t("ALL", "الكل"))}
                name={`story-chapter-number-${index}`}
                value={item.number ?? ""}
                onChange={(e) => update({ ...item, number: e.target.value })}
              />
              <TextField
                label={tr(t("Title", "العنوان"))}
                name={`story-chapter-title-${index}`}
                value={chapterTextAt(index).title}
                onChange={(e) => setChapterText(index, { title: e.target.value })}
              />
            </div>
            <TextareaField
              label={tr(t("Text", "النص"))}
              name={`story-chapter-text-${index}`}
              value={chapterTextAt(index).text}
              onChange={(e) => setChapterText(index, { text: e.target.value })}
            />
            <ImageUploadField
              pageKey={pageKey}
              label={sharedLabel(
                t("Background image", "الصورة الخلفية"),
                t("ALL", "الكل")
              )}
              name={`story-chapter-image-${index}`}
              value={item.image ?? legacyImages[index] ?? ""}
              onChange={(image) => update({ ...item, image })}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setFramingChapter(index)}
                className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-xs font-medium text-secondary transition-colors hover:border-accent hover:text-primary"
              >
                <SettingsIcon className="h-4 w-4" />
                {t("Image framing", "تنسيق الصورة")}
              </button>
            </div>
          </div>
        )}
      />
      <StoryImageSettingsModal
        open={framingChapter !== null}
        imageUrl={framingImage}
        value={framingItem?.imagePresentation}
        descriptionTextStyle={framingItem?.descriptionTextStyle}
        onChange={updateImagePresentation}
        onDescriptionTextStyleChange={updateDescriptionTextStyle}
        onClose={() => setFramingChapter(null)}
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
      <TextField
        label={tr(t("Copyright / rights notice", "حقوق النشر"))}
        value={text.copyright ?? ""}
        onChange={(e) => setText({ copyright: e.target.value })}
        placeholder="All rights reserved © {year}"
      />
      <p className="-mt-2 text-xs text-secondary">
        {t(
          "Use {year} to display the current year automatically.",
          "استخدم {year} لإظهار السنة الحالية تلقائياً."
        )}
      </p>

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
