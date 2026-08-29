import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AboutEditor,
  ContactEditor,
  GalleryEditor,
  InstagramEditor,
  LanguageTabs,
  LatestWeddingsEditor,
  ProcessEditor,
  StoryEditor,
  TestimonialsEditor
} from "./SectionEditors";
import { HeroFields } from "./HeroFields";
import { LogoLoader } from "@/components/LogoLoader";
import {
  CameraIcon,
  ChevronDownIcon,
  ClipboardIcon,
  EyeIcon,
  ImageIcon,
  SaveIcon,
  UsersIcon
} from "@/components/icons";
import { useLanguage } from "@/i18n/languageContext";
import { usePageContentQuery, useUpdatePageContent } from "@/hooks/usePageContent";
import { CmsEditorLayout } from "@/components/CmsEditorLayout";
import { TextField } from "@/components/TextField";
import { Repeater } from "@/components/Repeater";
import { LogoUploadField } from "@/components/LogoUploadField";
import {
  DEFAULT_CMS_LOCALE,
  HIDEABLE_SECTIONS,
  TRANSLATABLE_FIELDS,
  migrateLegacySectionText,
  pageTranslationStatus,
  type CmsHero,
  type CmsLocale,
  type HideableSection,
  type HomepageCmsContent,
  type TranslatableSection
} from "@/types/pageContent";

type SectionKey =
  | "hero"
  | "latestWeddings"
  | "gallery"
  | "about"
  | "story"
  | "process"
  | "testimonials"
  | "instagram"
  | "clients"
  | "contact";

type SectionMeta = {
  key: SectionKey;
  labelEn: string;
  labelAr: string;
};

/**
 * Homepage sections, listed in the order the public site renders them
 * (see web/app/[locale]/page.tsx). Keep this list in sync with that file.
 *
 * The order here is presentational only: reordering in the UI does not change
 * the site, because the content API has no `order` field. Same for the enabled
 * flags. Everything *inside* the section editors is persisted normally.
 */
const SECTIONS: SectionMeta[] = [
  { key: "hero", labelEn: "Hero", labelAr: "البطل الرئيسي" },
  { key: "latestWeddings", labelEn: "Latest Weddings", labelAr: "أحدث الزواجات" },
  { key: "gallery", labelEn: "Gallery", labelAr: "المعرض" },
  { key: "about", labelEn: "About", labelAr: "نبذة عني" },
  { key: "story", labelEn: "Story", labelAr: "القصة المميزة" },
  { key: "process", labelEn: "Process", labelAr: "كيف نعمل" },
  { key: "testimonials", labelEn: "Testimonials", labelAr: "آراء العملاء" },
  { key: "instagram", labelEn: "Instagram", labelAr: "إنستغرام" },
  { key: "clients", labelEn: "Trusted by", labelAr: "موضع ثقة" },
  { key: "contact", labelEn: "Contact", labelAr: "التواصل" }
];

/**
 * Fold each section's pre-translation flat text into `text.en` on save.
 *
 * The editors seed the English tab from those fields, so leaving them behind
 * would keep a stale duplicate that the public site still falls back to — an
 * English edit would appear to do nothing.
 */
function migrateLegacyPageText(content: HomepageCmsContent): HomepageCmsContent {
  const next: Record<string, unknown> = { ...content };

  for (const key of Object.keys(TRANSLATABLE_FIELDS) as TranslatableSection[]) {
    const section = next[key];
    if (section) next[key] = migrateLegacySectionText(section as object, key);
  }

  return next as HomepageCmsContent;
}

/** Narrows a section key to one the site can actually skip (everything but the hero). */
function isHideable(key: SectionKey): key is HideableSection {
  return (HIDEABLE_SECTIONS as readonly string[]).includes(key);
}

function SectionIcon({ section }: { section: SectionKey }) {
  const icons: Record<SectionKey, typeof ImageIcon> = {
    hero: ImageIcon,
    latestWeddings: CameraIcon,
    gallery: ImageIcon,
    about: UsersIcon,
    story: CameraIcon,
    process: ClipboardIcon,
    testimonials: UsersIcon,
    instagram: CameraIcon,
    clients: UsersIcon,
    contact: UsersIcon
  };
  const Icon = icons[section];
  return <Icon className="h-4 w-4 shrink-0 text-secondary" />;
}

/**
 * Left rail: jump-to-section nav.
 *
 * Order is fixed by the public site, so this lists rather than reorders.
 */
function SectionList({
  hiddenSections
}: {
  hiddenSections: Partial<Record<HideableSection, boolean>>;
}) {
  const { t } = useLanguage();

  return (
    <section className="rounded-lg border border-line bg-card p-4 shadow-[0_18px_60px_rgba(25,25,25,0.04)]">
      <h2 className="text-base font-semibold text-primary">
        {t("Homepage sections", "أقسام الصفحة الرئيسية")}
      </h2>
      <p className="mt-1 text-xs text-secondary">
        {t("In the order they appear on the site", "بالترتيب الذي تظهر به في الموقع")}
      </p>

      <ul className="mt-4 flex flex-col gap-1">
        {SECTIONS.map((meta, index) => {
          const hidden = isHideable(meta.key) && hiddenSections[meta.key];

          return (
            <li key={meta.key}>
              <a
                href={`#section-${meta.key}`}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-secondary transition-colors hover:bg-base/60 hover:text-primary"
              >
                <span className="w-4 shrink-0 text-center text-[11px] text-secondary/70">
                  {index + 1}
                </span>
                <SectionIcon section={meta.key} />
                <span className={`truncate ${hidden ? "line-through opacity-60" : ""}`}>
                  {t(meta.labelEn, meta.labelAr)}
                </span>
                {hidden ? (
                  <span className="ms-auto shrink-0 text-[10px] text-secondary/70">
                    {t("Hidden", "مخفي")}
                  </span>
                ) : null}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SectionShell({
  id,
  title,
  hidden,
  onToggleHidden,
  children
}: {
  id: string;
  title: string;
  /** Undefined for sections that cannot be hidden (the hero). */
  hidden?: boolean;
  onToggleHidden?: (hidden: boolean) => void;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  // Collapsed by default: eight expanded sections bury the page, so the admin
  // opens the one they came to edit.
  const [open, setOpen] = useState(false);

  return (
    <section
      id={id}
      className={`scroll-mt-4 rounded-lg border bg-card shadow-[0_18px_60px_rgba(25,25,25,0.04)] ${
        hidden ? "border-dashed border-secondary/40" : "border-line"
      }`}
    >
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <ChevronDownIcon
            className={`h-4 w-4 shrink-0 text-secondary transition-transform ${open ? "" : "-rotate-90 rtl:rotate-90"}`}
          />
          <span
            className={`flex-1 truncate text-start text-base font-semibold ${
              hidden ? "text-secondary" : "text-primary"
            }`}
          >
            {title}
          </span>
        </button>

        {onToggleHidden ? (
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-secondary">
            <input
              type="checkbox"
              checked={!hidden}
              onChange={(e) => onToggleHidden(!e.target.checked)}
              className="h-4 w-4 shrink-0 accent-[#171b24]"
            />
            {hidden ? t("Hidden", "مخفي") : t("Visible", "ظاهر")}
          </label>
        ) : null}
      </div>

      {open ? (
        <div className="grid gap-4 px-5 pb-5">
          {hidden ? (
            <p className="rounded-lg border border-secondary/20 bg-base/60 px-3 py-2 text-xs text-secondary">
              {t(
                "This section is hidden and will not appear on the site. Its content is still saved.",
                "هذا القسم مخفي ولن يظهر في الموقع. المحتوى محفوظ كما هو."
              )}
            </p>
          ) : null}
          {children}
        </div>
      ) : null}
    </section>
  );
}

function TrustedByEditor({
  value,
  onChange,
  pageKey
}: {
  value: NonNullable<HomepageCmsContent["clients"]>;
  onChange: (next: NonNullable<HomepageCmsContent["clients"]>) => void;
  /** Asset folder logo uploads are written to. */
  pageKey: string;
}) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <p className="text-xs leading-5 text-secondary">
        {t(
          "Add company names, then upload a logo or paste a link to one. An empty list keeps the built-in logos.",
          "أضف أسماء الشركات، ثم ارفع شعارًا أو الصق رابطًا له. اترك القائمة فارغة لاستخدام الشعارات الافتراضية."
        )}
      </p>

      {/*
        Uses the shared Repeater like every other list in the CMS. The
        hand-rolled list this replaced keyed each row by its own text, so every
        keystroke produced a new key, unmounted the input and dropped focus —
        the company name had to be typed one letter per click.
      */}
      <Repeater
        label={t("Companies", "الشركات")}
        items={value.items ?? []}
        onChange={(items) => onChange({ ...value, items })}
        createItem={() => ({ name: "", logoUrl: "" })}
        addLabel={t("Add company logo", "إضافة شعار شركة")}
        renderItem={(item, index, update) => (
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <TextField
              label={t("Company name", "اسم الشركة")}
              name={`client-name-${index}`}
              value={item.name ?? ""}
              onChange={(e) => update({ ...item, name: e.target.value })}
            />
            <LogoUploadField
              pageKey={pageKey}
              label={t("Logo", "الشعار")}
              name={`client-logo-${index}`}
              value={item.logoUrl ?? ""}
              onChange={(logoUrl) => update({ ...item, logoUrl })}
            />
          </div>
        )}
      />
    </div>
  );
}

export default function HomePageManager() {
  const { t } = useLanguage();
  const [saved, setSaved] = useState(false);
  const [locale, setLocale] = useState<CmsLocale>(DEFAULT_CMS_LOCALE);

  const { data, isPending, isError, refetch } = usePageContentQuery("home");
  const updatePage = useUpdatePageContent("home");

  const initial = useMemo(
    () => (data?.content ?? {}) as HomepageCmsContent,
    [data?.content]
  );
  const [draft, setDraft] = useState<HomepageCmsContent>(initial);

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  const update = <K extends keyof HomepageCmsContent>(
    key: K,
    value: HomepageCmsContent[K]
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const hiddenSections = draft.hiddenSections ?? {};

  /** Every translatable section on this page, for the page-level tab badge. */
  const translatableSections: {
    section: object | undefined;
    key: TranslatableSection;
  }[] = [
    { section: draft.hero, key: "hero" },
    { section: draft.latestWeddings, key: "latestWeddings" },
    { section: draft.gallery, key: "gallery" },
    { section: draft.about, key: "about" },
    { section: draft.story, key: "story" },
    { section: draft.process, key: "process" },
    { section: draft.testimonials, key: "testimonials" },
    { section: draft.instagram, key: "instagram" },
    { section: draft.contact, key: "contact" }
  ];

  const setHidden = (section: HideableSection, hidden: boolean) => {
    setDraft((current) => ({
      ...current,
      hiddenSections: { ...current.hiddenSections, [section]: hidden }
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    // Carry the existing title/published through — this editor only owns content.
    await updatePage.mutateAsync({
      title: data?.title ?? "Home",
      published: data?.published ?? true,
      content: migrateLegacyPageText(draft)
    });
    setSaved(true);
  };

  /**
   * Save straight after a hero upload, rather than waiting for the admin to
   * press Save. The file is already in the bucket at this point, so leaving it
   * unreferenced in an unsaved draft would strand it there.
   *
   * The rest of the draft rides along, so an upload mid-edit does not discard
   * text the admin has already typed.
   */
  const handleCommitHeroMedia = async (nextHero: CmsHero) => {
    const nextDraft = { ...draft, hero: nextHero };
    setDraft(nextDraft);
    await updatePage.mutateAsync({
      title: data?.title ?? "Home",
      published: data?.published ?? true,
      content: migrateLegacyPageText(nextDraft)
    });
    setSaved(true);
  };

  if (isError) {
    return (
      <section className="rounded-lg border border-line bg-card p-5">
        <p className="text-sm text-danger">
          {t("Could not load homepage content.", "تعذر تحميل محتوى الصفحة الرئيسية.")}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-3 text-xs font-medium text-danger underline underline-offset-2"
        >
          {t("Try again", "حاول مرة أخرى")}
        </button>
      </section>
    );
  }

  if (isPending) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <LogoLoader />
      </div>
    );
  }

  const sectionBody: Record<SectionKey, ReactNode> = {
    hero: (
      <HeroFields
        value={draft.hero ?? {}}
        onChange={(next) => update("hero", next)}
        locale={locale}
        pageKey="home"
        onCommitMedia={handleCommitHeroMedia}
      />
    ),
    latestWeddings: (
      <LatestWeddingsEditor
        value={draft.latestWeddings ?? {}}
        onChange={(next) => update("latestWeddings", next)}
        locale={locale}
      />
    ),
    gallery: (
      <GalleryEditor
        value={draft.gallery ?? {}}
        onChange={(next) => update("gallery", next)}
        locale={locale}
      />
    ),
    about: (
      <AboutEditor
        value={draft.about ?? {}}
        onChange={(next) => update("about", next)}
        locale={locale}
      />
    ),
    story: (
      <StoryEditor
        value={draft.story ?? {}}
        onChange={(next) => update("story", next)}
        locale={locale}
      />
    ),
    process: (
      <ProcessEditor
        value={draft.process ?? {}}
        onChange={(next) => update("process", next)}
        locale={locale}
      />
    ),
    testimonials: (
      <TestimonialsEditor
        value={draft.testimonials ?? {}}
        onChange={(next) => update("testimonials", next)}
        locale={locale}
      />
    ),
    instagram: (
      <InstagramEditor
        value={draft.instagram ?? {}}
        onChange={(next) => update("instagram", next)}
        locale={locale}
      />
    ),
    clients: (
      <TrustedByEditor
        value={draft.clients ?? {}}
        onChange={(next) => update("clients", next)}
        pageKey="home"
      />
    ),
    contact: (
      <ContactEditor
        value={draft.contact ?? {}}
        onChange={(next) => update("contact", next)}
        locale={locale}
      />
    )
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-lg border border-line bg-card shadow-[0_18px_60px_rgba(25,25,25,0.04)]">
        <div className="flex flex-col gap-5 border-b border-line p-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            {t("Page workspace", "مساحة عمل الصفحة")}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <ClipboardIcon className="h-7 w-7 text-accent" />
            <h1 className="text-2xl font-semibold text-primary">
              {t("Home", "الرئيسية")}
            </h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">
            {t(
              "Edit the homepage content, featured work, and the sections your visitors see.",
              "عدّل محتوى الصفحة الرئيسية والأعمال المميزة والأقسام التي يراها زوار موقعك."
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={import.meta.env.VITE_PUBLIC_SITE_URL ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-line bg-card px-4 text-sm text-secondary transition-colors hover:border-accent hover:bg-base/60 hover:text-primary"
          >
            <EyeIcon className="h-4 w-4 shrink-0" />
            {t("Preview page", "معاينة الصفحة")}
          </a>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={updatePage.isPending}
            className="flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-accent px-5 text-sm font-medium text-white shadow-lg shadow-accent/20 transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-60"
          >
            <SaveIcon className="h-4 w-4 shrink-0" />
            {updatePage.isPending
              ? t("Saving...", "جارٍ الحفظ...")
              : t("Save & publish", "حفظ ونشر")}
          </button>
        </div>
        </div>
      </section>

      {saved ? (
        <p className="rounded-lg border border-success/20 bg-success/10 px-4 py-2.5 text-sm text-success">
          {t("Homepage content saved.", "تم حفظ محتوى الصفحة الرئيسية.")}
        </p>
      ) : null}
      {updatePage.isError ? (
        <p className="rounded-lg border border-danger/20 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {t("Could not save changes.", "تعذر حفظ التغييرات.")}
        </p>
      ) : null}

      <LanguageTabs
        active={locale}
        onChange={setLocale}
        statusFor={(l) => pageTranslationStatus(translatableSections, l)}
      />

      <CmsEditorLayout
        previewPageKey="home"
        previewPath="/"
        // The draft is sent as authored, with every language present — the
        // site localizes it for the language being previewed.
        previewContent={migrateLegacyPageText(draft)}
        previewLocale={locale}
      >
        <div className="grid gap-5 2xl:grid-cols-[14rem_minmax(0,1fr)]">
          <SectionList hiddenSections={hiddenSections} />

          <div className="min-w-0 space-y-4">
          {SECTIONS.map((meta) => {
            // Bound to a local so the narrowing survives into the JSX below —
            // a plain boolean would not carry `meta.key`'s refined type there.
            const hideableKey = isHideable(meta.key) ? meta.key : undefined;

            return (
                <SectionShell
                  key={meta.key}
                  id={`section-${meta.key}`}
                  title={t(meta.labelEn, meta.labelAr)}
                  hidden={
                    hideableKey ? Boolean(hiddenSections[hideableKey]) : undefined
                  }
                  onToggleHidden={
                    hideableKey ? (next) => setHidden(hideableKey, next) : undefined
                  }
                >
                  {sectionBody[meta.key]}
                </SectionShell>
              );
            })}
          </div>
        </div>
      </CmsEditorLayout>
    </div>
  );
}
