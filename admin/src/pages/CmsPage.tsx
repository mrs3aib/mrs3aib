import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { TextField } from "@/components/TextField";
import { TextareaField } from "@/components/TextareaField";
import { SelectField } from "@/components/SelectField";
import { Toggle } from "@/components/Toggle";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import {
  usePageAssetDelete,
  usePageAssetsQuery,
  usePageAssetUpload
} from "@/hooks/usePageAssetUpload";
import { storageKeyFromUrl, type PageAsset } from "@/services/pageContentService";
import {
  AboutEditor,
  ContactEditor,
  FooterEditor,
  GalleryEditor,
  InstagramEditor,
  LanguageTabs,
  ProcessEditor,
  SectionCard,
  StoryEditor,
  TestimonialsEditor
} from "./cms/SectionEditors";
import { usePageContentQuery, useUpdatePageContent } from "@/hooks/usePageContent";
import { useLanguage } from "@/i18n/languageContext";
import {
  DEFAULT_CMS_LOCALE,
  FOOTER_TEXT_FIELDS,
  migrateLegacySectionText,
  pageTranslationStatus,
  sectionDraftFor,
  type CmsCategory,
  type CmsFooter,
  type CmsHero,
  type CmsLocale,
  type HomepageCmsContent
} from "@/types/pageContent";

/** The footer is site-wide, so it gets its own record rather than living on `home`. */
const FOOTER_PAGE_KEY = "footer";

type HeroPage = {
  pageKey: string;
  title: string;
  description: string;
  defaultHero: CmsHero;
};

const HOME_PAGE: HeroPage = {
  pageKey: "home",
  title: "Home page",
  description: "Main website hero section.",
  defaultHero: {
    mediaType: "image",
    mediaUrl: "/images/hero-wedding-cinematic.png",
    studio: "",
    wordmark: "",
    title: "",
    cta: "",
    ctaSecondary: ""
  }
};

const DEFAULT_CATEGORIES: CmsCategory[] = [
  { id: "weddings", label: "Weddings" },
  { id: "companies", label: "Companies" },
  { id: "restaurants", label: "Restaurants & Cafes" },
  { id: "events", label: "Events" },
  { id: "products", label: "Products" },
  { id: "realEstate", label: "Real Estate" },
  { id: "drone", label: "Drone" },
  { id: "cinematicVideo", label: "Cinematic Video" }
];

const HERO_VIDEO_MAX_DURATION_SECONDS = 60;
const HERO_VIDEO_MAX_DURATION_LABEL = "1 minute";

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

function buildHeroPages(categories: CmsCategory[]): HeroPage[] {
  return [
    HOME_PAGE,
    ...categories.map((category) => ({
      pageKey: `category-${category.id}`,
      title: `${category.label} category`,
      description: `Hero section for the ${category.label} category page.`,
      defaultHero: {
        mediaType: "image" as const,
        mediaUrl: "",
        kicker: "",
        title: "",
        subtitle: "",
        cta: ""
      }
    }))
  ];
}

function categoriesFromContent(content: unknown): CmsCategory[] {
  const categories = (content as HomepageCmsContent | undefined)?.categories;
  return categories?.length ? categories : DEFAULT_CATEGORIES;
}

function slugifyCategory(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CmsPage() {
  const { pageKey } = useParams();
  const { data: categoriesData, isPending: categoriesPending } =
    usePageContentQuery("categories");
  const categories = categoriesFromContent(categoriesData?.content);
  const page = buildHeroPages(categories).find((item) => item.pageKey === pageKey);

  if (!pageKey) return <CmsList categories={categories} />;
  if (pageKey === FOOTER_PAGE_KEY) return <FooterPageEditor />;
  if (categoriesPending) return <CmsLoading title="CMS" />;
  if (!page) return <CmsNotFound />;

  return <HeroEditor page={page} />;
}

function CmsList({ categories }: { categories: CmsCategory[] }) {
  const [draft, setDraft] = useState<CmsCategory[]>(categories);
  const [newName, setNewName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CmsCategory | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const updateCategories = useUpdatePageContent("categories");
  const heroPages = buildHeroPages(draft);
  const deleteMatches =
    deleteTarget !== null && deleteConfirmation.trim() === deleteTarget.label;

  useEffect(() => {
    setDraft(categories);
  }, [categories]);

  const updateCategory = (index: number, label: string) => {
    setDraft((current) =>
      current.map((category, i) =>
        i === index ? { ...category, label } : category
      )
    );
    setSaved(false);
  };

  const addCategory = () => {
    const id = slugifyCategory(newName);
    if (!id || draft.some((category) => category.id === id)) return;
    setDraft((current) => [...current, { id, label: newName.trim() }]);
    setNewName("");
    setSaved(false);
  };

  const openDeleteCategory = (category: CmsCategory) => {
    setDeleteTarget(category);
    setDeleteConfirmation("");
  };

  const confirmDeleteCategory = () => {
    if (!deleteTarget || !deleteMatches) return;
    setDraft((current) =>
      current.filter((category) => category.id !== deleteTarget.id)
    );
    setDeleteTarget(null);
    setDeleteConfirmation("");
    setSaved(false);
  };

  const saveCategories = async () => {
    setSaveError(null);
    setSaved(false);
    try {
      await updateCategories.mutateAsync({
        title: "Categories",
        published: true,
        content: { categories: draft }
      });
      setSaved(true);
    } catch {
      setSaveError("Could not save categories. Please try again.");
    }
  };

  return (
    <div>
      <PageHeader label="CMS" title="Hero sections" />

      <section className="mb-7 max-w-4xl rounded-lg border border-line bg-card p-5">
        <h2 className="font-display text-xl font-semibold text-primary">
          Categories
        </h2>
        <div className="mt-5 space-y-3">
          {draft.map((category, index) => (
            <div
              key={category.id}
              className="grid gap-3 md:grid-cols-[1fr_12rem_auto]"
            >
              <TextField
                label={index === 0 ? "Category name" : " "}
                value={category.label}
                onChange={(e) => updateCategory(index, e.target.value)}
              />
              <TextField label={index === 0 ? "URL id" : " "} value={category.id} disabled />
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => openDeleteCategory(category)}
                  className="text-danger hover:text-danger/80"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
          <TextField
            label="New category"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Example: Luxury Cars"
          />
          <div className="flex items-end">
            <Button type="button" variant="secondary" onClick={addCategory}>
              Add category
            </Button>
          </div>
        </div>

        {saveError ? <p className="mt-4 text-sm text-danger">{saveError}</p> : null}
        {saved && !updateCategories.isPending ? (
          <p className="mt-4 text-sm text-success">Categories saved.</p>
        ) : null}

        <div className="mt-5 flex justify-end">
          <Button
            type="button"
            loading={updateCategories.isPending}
            onClick={() => void saveCategories()}
          >
            Save categories
          </Button>
        </div>
      </section>

      <Link
        to={`/cms/${FOOTER_PAGE_KEY}`}
        className="group mb-7 flex max-w-4xl items-center justify-between gap-5 rounded-lg border border-line bg-card px-5 py-4 transition-colors hover:bg-line/60 focus-visible:bg-line/60 focus-visible:outline-none"
      >
        <div>
          <h2 className="font-display text-lg font-semibold text-primary">
            Footer
          </h2>
          <p className="mt-1 text-sm text-secondary">
            Contact details and social links, shown on every page.
          </p>
        </div>
        <span className="text-sm font-medium text-accent opacity-80 transition-opacity group-hover:opacity-100">
          Edit
        </span>
      </Link>

      <div className="max-w-4xl overflow-hidden rounded-lg border border-line bg-card">
        {heroPages.map((page) => (
          <Link
            key={page.pageKey}
            to={`/cms/${page.pageKey}`}
            className="group flex items-center justify-between gap-5 border-b border-line px-5 py-4 transition-colors last:border-b-0 hover:bg-line/60 focus-visible:bg-line/60 focus-visible:outline-none"
          >
            <div>
              <h2 className="font-display text-lg font-semibold text-primary">
                {page.title}
              </h2>
              <p className="mt-1 text-sm text-secondary">{page.description}</p>
            </div>
            <span className="text-sm font-medium text-accent opacity-80 transition-opacity group-hover:opacity-100">
              Edit
            </span>
          </Link>
        ))}
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteConfirmation("");
        }}
        title="Delete category"
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Type{" "}
            <span className="font-medium text-primary">{deleteTarget?.label}</span>{" "}
            to delete this category. This removes it from the CMS category list after
            you save categories.
          </p>
          <TextField
            label="Category name"
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            placeholder={deleteTarget?.label ?? ""}
          />
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteConfirmation("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmDeleteCategory}
              disabled={!deleteMatches}
              className="bg-danger text-base hover:bg-danger/90"
            >
              Delete category
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function CmsLoading({ title }: { title: string }) {
  return (
    <div>
      <PageHeader label="CMS" title={title} />
      <div className="max-w-2xl space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="block h-14 animate-pulse rounded-md bg-line" />
        ))}
      </div>
    </div>
  );
}

function CmsNotFound() {
  return (
    <div>
      <PageHeader label="CMS" title="Hero section not found" />
      <Button type="button" variant="secondary" onClick={() => history.back()}>
        Back
      </Button>
    </div>
  );
}

function HeroEditor({ page }: { page: HeroPage }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data, isPending, isError, refetch } = usePageContentQuery(page.pageKey);
  const updatePage = useUpdatePageContent(page.pageKey);
  const uploadAsset = usePageAssetUpload(page.pageKey);
  const deleteAsset = usePageAssetDelete(page.pageKey);
  const initialContent = useMemo(
    () => (data?.content ?? { hero: page.defaultHero }) as HomepageCmsContent,
    [data, page.defaultHero]
  );

  const [published, setPublished] = useState(true);
  const [locale, setLocale] = useState<CmsLocale>(DEFAULT_CMS_LOCALE);
  const [hero, setHero] = useState<CmsHero>(page.defaultHero);
  /**
   * Every non-hero section, edited as one object. Kept separate from `hero` so
   * the existing hero save path is untouched, and merged back on save.
   */
  const [sections, setSections] = useState<HomepageCmsContent>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const isHome = page.pageKey === "home";
  const heroFields = isHome
    ? ["studio", "wordmark", "title", "cta", "ctaSecondary"]
    : ["kicker", "title", "subtitle", "cta"];
  const heroText = sectionDraftFor(hero, "hero", locale);

  useEffect(() => {
    setPublished(data?.published ?? true);
    setHero({ ...page.defaultHero, ...(initialContent.hero ?? {}) });
    setSections(initialContent);
  }, [data, initialContent, page.defaultHero]);

  const updateHero = (next: CmsHero) => {
    setHero(next);
    setSaved(false);
  };

  const updateHeroText = (patch: Record<string, string>) =>
    updateHero({
      ...hero,
      text: {
        ...hero.text,
        [locale]: { ...heroText, ...patch }
      }
    });

  const updateSection = <K extends keyof HomepageCmsContent>(
    key: K,
    value: HomepageCmsContent[K]
  ) => {
    setSections((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return;

    const acceptedVideoTypes = ["video/mp4", "video/webm", "video/ogg"];
    const isVideo = acceptedVideoTypes.includes(file.type);

    if (!file.type.startsWith("image/") && !isVideo) {
      setUploadError("Only images, MP4, WebM, and Ogg videos are allowed.");
      return;
    }

    if (isVideo) {
      try {
        const duration = await getVideoDuration(file);
        if (duration > HERO_VIDEO_MAX_DURATION_SECONDS) {
          setUploadError(
            `Hero videos must be ${HERO_VIDEO_MAX_DURATION_LABEL} or shorter.`
          );
          return;
        }
      } catch {
        setUploadError("Could not read video duration. Please try another file.");
        return;
      }
    }

    setUploadError(null);
    setSaved(false);

    // Captured before the upload overwrites `mediaUrl` — otherwise the file
    // being replaced becomes unreachable and lingers in the bucket forever.
    const replacedKey = storageKeyFromUrl(hero.mediaUrl);

    try {
      const result = await uploadAsset.mutateAsync(file);
      const nextHero: CmsHero = {
        ...hero,
        mediaType: file.type.startsWith("video/") ? "video" : "image",
        mediaUrl: result.assetUrl
      };
      const savedHero = migrateLegacySectionText(nextHero, "hero");
      updateHero(savedHero);
      await updatePage.mutateAsync({
        title: page.title,
        published,
        content: {
          ...initialContent,
          hero: savedHero
        }
      });

      // Only once the new media is safely saved. A failure here leaves an
      // orphan, which is far better than deleting media the page still needs.
      if (replacedKey && replacedKey !== result.storageKey) {
        try {
          await deleteAsset.mutateAsync(replacedKey);
        } catch {
          // Non-fatal: the upload succeeded, which is what the admin asked for.
        }
      }

      setSaved(true);
    } catch {
      setUploadError("Could not upload file. Please try again.");
    }
  };

  const handleDeleteAsset = async (storageKey: string) => {
    const isCurrent = storageKeyFromUrl(hero.mediaUrl) === storageKey;
    const label = isCurrent
      ? "This file is currently used by the page. Delete it permanently and clear it from the hero?"
      : "Delete this file permanently from storage?";
    if (!window.confirm(label)) return;

    setUploadError(null);
    setSaved(false);

    try {
      // Unreference before deleting, so a failure mid-way leaves an unused file
      // rather than the page pointing at bytes that no longer exist.
      if (isCurrent) {
        const nextHero = migrateLegacySectionText(
          { ...hero, mediaUrl: "", posterUrl: "" },
          "hero"
        );
        updateHero(nextHero);
        await updatePage.mutateAsync({
          title: page.title,
          published,
          content: { ...initialContent, hero: nextHero }
        });
      }

      await deleteAsset.mutateAsync(storageKey);
      setSaved(true);
    } catch {
      setUploadError("Could not delete file. Please try again.");
    }
  };

  const handleSave = async () => {
    setSaveError(null);
    setSaved(false);
    try {
      await updatePage.mutateAsync({
        title: page.title,
        published,
        content: {
          ...initialContent,
          ...sections,
          hero: migrateLegacySectionText(hero, "hero")
        }
      });
      setSaved(true);
    } catch {
      setSaveError("Could not save hero content. Please try again.");
    }
  };

  if (isError) {
    return (
      <div>
        <PageHeader label="CMS" title={page.title} />
        <div className="max-w-md rounded-lg border border-danger/30 bg-danger/5 p-5">
          <p className="text-sm text-danger">Could not load this hero section.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="tracking-nav mt-3 text-xs font-medium uppercase text-danger underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (isPending) {
    return (
      <div>
        <PageHeader label="CMS" title={page.title} />
        <div className="max-w-2xl space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="block h-14 animate-pulse rounded-md bg-line" />
          ))}
        </div>
      </div>
    );
  }

  const translationStatusFor = (targetLocale: CmsLocale) => {
    const localizedHero = sectionDraftFor(hero, "hero", targetLocale);
    const heroFilled = heroFields.filter((field) => localizedHero[field]?.trim()).length;
    const heroStatus = {
      filled: heroFilled,
      total: heroFields.length,
      complete: heroFilled === heroFields.length,
      empty: heroFilled === 0
    };

    if (!isHome) return heroStatus;

    const sectionsStatus = pageTranslationStatus(
      [
        { section: sections.about, key: "about" },
        { section: sections.gallery, key: "gallery" },
        { section: sections.story, key: "story" },
        { section: sections.process, key: "process" },
        { section: sections.testimonials, key: "testimonials" },
        { section: sections.instagram, key: "instagram" },
        { section: sections.contact, key: "contact" }
      ],
      targetLocale
    );
    const filled = heroStatus.filled + sectionsStatus.filled;
    const total = heroStatus.total + sectionsStatus.total;

    return { filled, total, complete: filled === total, empty: filled === 0 };
  };

  return (
    <div>
      <PageHeader label="CMS" title={page.title} />

      <div className="mb-5">
        <Button type="button" variant="secondary" onClick={() => navigate("/cms")}>
          Back to list
        </Button>
      </div>

      <div className="max-w-2xl rounded-lg border border-line bg-card p-5">
        <div className="rounded-md border border-line px-4">
          <Toggle
            label="Published"
            description="When off, the public page uses fallback hero content."
            checked={published}
            onChange={setPublished}
          />
        </div>

        <div className="mt-5 grid gap-4">
          <SelectField
            label="Hero media type"
            value={hero.mediaType ?? "image"}
            onChange={(e) =>
              updateHero({ ...hero, mediaType: e.target.value as "image" | "video" })
            }
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
          </SelectField>

          <TextField
            label="Hero image/video URL"
            value={hero.mediaUrl ?? ""}
            onChange={(e) => updateHero({ ...hero, mediaUrl: e.target.value })}
            placeholder="/images/hero.jpg, /video/hero.mp4 or https://..."
          />

          <AssetLibrary
            pageKey={page.pageKey}
            currentUrl={hero.mediaUrl}
            onSelect={(asset) =>
              updateHero({
                ...hero,
                mediaUrl: asset.url,
                mediaType: asset.contentType.startsWith("video/") ? "video" : "image"
              })
            }
            onDelete={(storageKey) => void handleDeleteAsset(storageKey)}
            deletingKey={deleteAsset.isPending ? deleteAsset.variables : undefined}
          />

          <div>
            <label
              htmlFor="hero-media-upload"
              className="tracking-nav mb-2 block text-xs font-medium uppercase text-secondary"
            >
              Upload image/video
            </label>
            <p className="mb-2 text-xs text-secondary">
              Hero videos can be up to {HERO_VIDEO_MAX_DURATION_LABEL} long.
            </p>
            <input
              id="hero-media-upload"
              type="file"
              accept="image/*,video/mp4,video/webm,video/ogg"
              disabled={uploadAsset.isPending}
              onChange={(e) => void handleFileUpload(e.target.files?.[0])}
              className="w-full rounded-md border border-line bg-base px-3.5 py-2.5 text-sm text-primary file:me-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-base disabled:cursor-not-allowed disabled:opacity-60"
            />
            {uploadAsset.isPending ? (
              <p className="mt-2 text-sm text-secondary">Uploading media...</p>
            ) : null}
            {uploadError ? (
              <p className="mt-2 text-sm text-danger">{uploadError}</p>
            ) : null}
          </div>

          <TextField
            label="Video poster URL"
            value={hero.posterUrl ?? ""}
            onChange={(e) => updateHero({ ...hero, posterUrl: e.target.value })}
            placeholder="Optional for video"
          />

          <LanguageTabs
            active={locale}
            onChange={setLocale}
            statusFor={translationStatusFor}
          />
          <p className="text-xs text-secondary">
            Fields marked · {locale.toUpperCase()} are saved for this language only.
            Media and links are shared across both languages.
          </p>

          {isHome ? (
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label={`Studio name · ${locale.toUpperCase()}`}
                value={heroText.studio ?? ""}
                onChange={(e) => updateHeroText({ studio: e.target.value })}
              />
              <TextField
                label={`Wordmark · ${locale.toUpperCase()}`}
                value={heroText.wordmark ?? ""}
                onChange={(e) => updateHeroText({ wordmark: e.target.value })}
              />
            </div>
          ) : (
            <TextField
              label={`Kicker · ${locale.toUpperCase()}`}
              value={heroText.kicker ?? ""}
              onChange={(e) => updateHeroText({ kicker: e.target.value })}
            />
          )}

          <TextareaField
            label={`${isHome ? "Hero text" : "Title"} · ${locale.toUpperCase()}`}
            value={heroText.title ?? ""}
            onChange={(e) => updateHeroText({ title: e.target.value })}
          />

          {!isHome ? (
            <TextareaField
              label={`Subtitle · ${locale.toUpperCase()}`}
              value={heroText.subtitle ?? ""}
              onChange={(e) => updateHeroText({ subtitle: e.target.value })}
            />
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label={`Primary CTA · ${locale.toUpperCase()}`}
              value={heroText.cta ?? ""}
              onChange={(e) => updateHeroText({ cta: e.target.value })}
            />
            {isHome ? (
              <TextField
                label={`Secondary CTA · ${locale.toUpperCase()}`}
                value={heroText.ctaSecondary ?? ""}
                onChange={(e) => updateHeroText({ ctaSecondary: e.target.value })}
              />
            ) : null}
          </div>
        </div>

        {saveError ? <p className="mt-4 text-sm text-danger">{saveError}</p> : null}
        {saved && !updatePage.isPending ? (
          <p className="mt-4 text-sm text-success">Content saved.</p>
        ) : null}

        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            loading={updatePage.isPending}
            onClick={() => void handleSave()}
          >
            Save {isHome ? "content" : "hero"}
          </Button>
        </div>
      </div>

      {/* Only the homepage renders these sections; category pages are hero-only. */}
      {isHome ? (
        <div className="mt-5 grid max-w-2xl gap-3">
          <SectionCard
            title={t("About", "من نحن")}
            description={t("Intro paragraph and portrait beside it.", "فقرة تعريفية وصورة بجانبها.")}
          >
            <AboutEditor
              value={sections.about ?? {}}
              onChange={(next) => updateSection("about", next)}
              locale={locale}
            />
          </SectionCard>

          <SectionCard title={t("Gallery", "المعرض")} description={t("Featured work grid.", "شبكة الأعمال المميزة.")}>
            <GalleryEditor
              value={sections.gallery ?? {}}
              onChange={(next) => updateSection("gallery", next)}
              locale={locale}
            />
          </SectionCard>

          <SectionCard
            title={t("Story", "القصة")}
            description={t("Three-image composition with chapters.", "تكوين من ثلاث صور مع فصول.")}
          >
            <StoryEditor
              value={sections.story ?? {}}
              onChange={(next) => updateSection("story", next)}
              locale={locale}
            />
          </SectionCard>

          <SectionCard title={t("Process", "آلية العمل")} description={t("Numbered timeline of steps.", "خطوات مرقمة بالتسلسل.")}>
            <ProcessEditor
              value={sections.process ?? {}}
              onChange={(next) => updateSection("process", next)}
              locale={locale}
            />
          </SectionCard>

          <SectionCard title={t("Testimonials", "آراء العملاء")} description={t("Client quotes.", "اقتباسات العملاء.")}>
            <TestimonialsEditor
              value={sections.testimonials ?? {}}
              onChange={(next) => updateSection("testimonials", next)}
              locale={locale}
            />
          </SectionCard>

          <SectionCard title={t("Instagram", "إنستغرام")} description={t("Feed strip and profile link.", "شريط الصور ورابط الحساب.")}>
            <InstagramEditor
              value={sections.instagram ?? {}}
              onChange={(next) => updateSection("instagram", next)}
              locale={locale}
            />
          </SectionCard>

          <SectionCard
            title={t("Trusted by", "موضع ثقة")}
            description={t("Company logos in the moving strip on the home page.", "شعارات الشركات في الشريط المتحرك بالصفحة الرئيسية.")}
          >
            <TrustedByEditor
              value={sections.clients ?? {}}
              onChange={(next) => updateSection("clients", next)}
            />
          </SectionCard>

          <SectionCard
            title={t("Contact", "التواصل")}
            description={t("Email, Instagram and WhatsApp details.", "البريد الإلكتروني وإنستغرام وواتساب.")}
          >
            <ContactEditor
              value={sections.contact ?? {}}
              onChange={(next) => updateSection("contact", next)}
              locale={locale}
            />
          </SectionCard>

          <div className="flex justify-end">
            <Button
              type="button"
              loading={updatePage.isPending}
              onClick={() => void handleSave()}
            >
              Save content
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Drop social entries left blank.
 *
 * The editor adds a key as soon as a platform is picked, so a row the admin
 * added and then abandoned would otherwise persist as an empty string and come
 * back as a blank row next time.
 */
function withoutBlankSocialLinks(footer: CmsFooter): CmsFooter {
  if (!footer.social) return footer;

  const social = Object.fromEntries(
    Object.entries(footer.social).filter(([, url]) => url?.trim())
  );

  return { ...footer, social };
}

/**
 * Move any pre-translation flat text into `text.en` and drop the flat copy.
 *
 * The editor seeds the English tab from these fields, so leaving them in place
 * would keep a stale duplicate that the public site still falls back to — an
 * edit on the English tab would appear to do nothing.
 */
function migrateLegacyFooterText(footer: CmsFooter): CmsFooter {
  const next: CmsFooter = { ...footer };
  const en = { ...(footer.text?.en ?? {}) };
  let migrated = false;

  for (const field of FOOTER_TEXT_FIELDS) {
    const legacy = footer[field]?.trim();
    if (!legacy) continue;
    if (!en[field]?.trim()) en[field] = legacy;
    delete next[field];
    migrated = true;
  }

  if (!migrated) return footer;

  return { ...next, text: { ...footer.text, en } };
}

function TrustedByEditor({
  value,
  onChange
}: {
  value: NonNullable<HomepageCmsContent["clients"]>;
  onChange: (next: NonNullable<HomepageCmsContent["clients"]>) => void;
}) {
  const { t } = useLanguage();
  const items = value.items ?? [];

  return (
    <div className="space-y-4">
      <p className="text-xs leading-5 text-secondary">
        {t(
          "Add a company name and public logo URL. Leave the list empty to use built-in logos.",
          "أضف اسم الشركة ورابطًا عامًا للشعار. اترك القائمة فارغة لاستخدام الشعارات الافتراضية."
        )}
      </p>
      {items.map((item, index) => (
        <div key={`${item.name}-${index}`} className="grid gap-3 rounded-md border border-line p-3 md:grid-cols-[1fr_2fr_auto]">
          <TextField label={t("Company name", "اسم الشركة")} value={item.name} onChange={(event) => onChange({ ...value, items: items.map((current, i) => i === index ? { ...current, name: event.target.value } : current) })} />
          <TextField label={t("Logo URL", "رابط الشعار")} value={item.logoUrl} onChange={(event) => onChange({ ...value, items: items.map((current, i) => i === index ? { ...current, logoUrl: event.target.value } : current) })} placeholder="https://.../logo.svg" />
          <div className="flex items-end"><Button type="button" variant="secondary" onClick={() => onChange({ ...value, items: items.filter((_, i) => i !== index) })}>{t("Remove", "إزالة")}</Button></div>
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={() => onChange({ ...value, items: [...items, { name: "", logoUrl: "" }] })}>
        {t("Add company logo", "إضافة شعار شركة")}
      </Button>
    </div>
  );
}

/**
 * Editor for the site-wide footer. Separate from `HeroEditor` because the
 * footer has no hero and no media library — it is only text and links.
 */
function FooterPageEditor() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data, isPending, isError, refetch } =
    usePageContentQuery(FOOTER_PAGE_KEY);
  const updatePage = useUpdatePageContent(FOOTER_PAGE_KEY);

  const [published, setPublished] = useState(true);
  const [footer, setFooter] = useState<CmsFooter>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPublished(data?.published ?? true);
    setFooter((data?.content as HomepageCmsContent | undefined)?.footer ?? {});
  }, [data]);

  const handleSave = async () => {
    setSaveError(null);
    setSaved(false);
    try {
      await updatePage.mutateAsync({
        title: "Footer",
        published,
        content: {
          footer: migrateLegacyFooterText(withoutBlankSocialLinks(footer))
        }
      });
      setSaved(true);
    } catch {
      setSaveError("Could not save footer content. Please try again.");
    }
  };

  if (isError) {
    return (
      <div>
        <PageHeader label="CMS" title="Footer" />
        <div className="max-w-md rounded-lg border border-danger/30 bg-danger/5 p-5">
          <p className="text-sm text-danger">Could not load the footer content.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="tracking-nav mt-3 text-xs font-medium uppercase text-danger underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (isPending) return <CmsLoading title="Footer" />;

  return (
    <div>
      <PageHeader label="CMS" title="Footer" />

      <div className="mb-5">
        <Button type="button" variant="secondary" onClick={() => navigate("/cms")}>
          Back to list
        </Button>
      </div>

      <div className="max-w-2xl rounded-lg border border-line bg-card p-5">
        <div className="rounded-md border border-line px-4">
          <Toggle
            label="Published"
            description="When off, the footer uses its built-in translated text."
            checked={published}
            onChange={setPublished}
          />
        </div>

        <div className="mt-5 grid gap-4">
          <FooterEditor
            value={footer}
            onChange={(next) => {
              setFooter(next);
              setSaved(false);
            }}
          />
        </div>

        {saveError ? <p className="mt-4 text-sm text-danger">{saveError}</p> : null}
        {saved && !updatePage.isPending ? (
          <p className="mt-4 text-sm text-success">{t("Content saved.", "تم حفظ المحتوى.")}</p>
        ) : null}

        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            loading={updatePage.isPending}
            onClick={() => void handleSave()}
          >
            Save footer
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

/**
 * Everything stored in R2 for this page, newest first. Lets an admin see what
 * is taking up space, preview it, reuse it, or delete leftovers — none of which
 * was visible before, so replaced files accumulated unnoticed.
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
        <p className="text-sm text-danger">Could not load stored files.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-2 text-xs font-medium uppercase text-danger underline underline-offset-2"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!assets?.length) {
    return (
      <div className="rounded-md border border-line p-3">
        <p className="text-sm text-secondary">
          No files stored for this page yet. Upload one below.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-line p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="tracking-nav text-xs font-medium uppercase text-secondary">
          Stored files ({assets.length})
        </span>
        <span className="text-xs text-secondary">
          {formatBytes(assets.reduce((sum, a) => sum + a.size, 0))} total
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
            Preview unavailable
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
          {isCurrent ? (
            <span className="tracking-nav rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-accent">
              In use
            </span>
          ) : null}
        </div>

        {asset.lastModified ? (
          <p className="mt-1 text-xs text-secondary">
            {new Date(asset.lastModified).toLocaleString()}
          </p>
        ) : null}

        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={onSelect}
            disabled={isCurrent}
            className="text-xs font-medium uppercase text-primary underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Use
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="text-xs font-medium uppercase text-danger underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </li>
  );
}
