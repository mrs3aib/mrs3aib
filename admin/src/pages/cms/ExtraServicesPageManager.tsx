import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { CmsEditorLayout } from "@/components/CmsEditorLayout";
import { ImageUploadField } from "@/components/ImageUploadField";
import { HeroMediaPicker } from "@/components/HeroMediaPicker";
import { LogoLoader } from "@/components/LogoLoader";
import { Repeater } from "@/components/Repeater";
import { TextField } from "@/components/TextField";
import { TextareaField } from "@/components/TextareaField";
import { Toggle } from "@/components/Toggle";
import { EyeIcon, SaveIcon, SettingsIcon } from "@/components/icons";
import { useLanguage } from "@/i18n/languageContext";
import { usePageContentQuery, useUpdatePageContent } from "@/hooks/usePageContent";
import {
  BUILTIN_EXTRA_SERVICE_KEYS,
  BUILTIN_EXTRA_SERVICE_LABELS,
  EXTRA_SERVICES_PAGE_KEY,
  extraServicesTranslationStatus,
  normalizeExtraServicesForSave,
  type CmsExtraService,
  type CmsExtraServices,
  type CmsExtraServicesText,
  type CmsHero,
  type CmsLocale,
  type HomepageCmsContent
} from "@/types/pageContent";
import { LanguageTabs } from "./SectionEditors";

/**
 * The editor's starting point when no record exists yet.
 *
 * Seeded with the five built-in services rather than an empty list: the site
 * renders them whether or not a record exists, so opening the editor to
 * nothing would say the page was empty when it is not.
 */
function seedServices(): CmsExtraService[] {
  return BUILTIN_EXTRA_SERVICE_KEYS.map((key) => ({ key, images: [] }));
}

/** Caption for a row: its built-in name, or a number for an added row. */
function rowLabel(
  service: CmsExtraService,
  index: number,
  language: CmsLocale,
  t: (en: string, ar: string) => string
): string {
  const builtIn = service.key ? BUILTIN_EXTRA_SERVICE_LABELS[service.key] : undefined;
  if (builtIn) return builtIn[language];
  return t(`Custom service ${index + 1}`, `خدمة مخصصة ${index + 1}`);
}

export default function ExtraServicesPageManager() {
  const { t, language } = useLanguage();
  const { data, isPending, isError, refetch } = usePageContentQuery(
    EXTRA_SERVICES_PAGE_KEY
  );
  const updatePage = useUpdatePageContent(EXTRA_SERVICES_PAGE_KEY);

  const [published, setPublished] = useState(true);
  const [extra, setExtra] = useState<CmsExtraServices>({ services: [] });
  const [hero, setHero] = useState<CmsHero>({});
  const [locale, setLocale] = useState<CmsLocale>(language);
  /** Which service tab is open. An index, so it survives a rename. */
  const [activeService, setActiveService] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPublished(data?.published ?? true);
    const loaded = (data?.content as HomepageCmsContent | undefined)?.extraServices;
    setHero((data?.content as HomepageCmsContent | undefined)?.hero ?? {});
    setExtra({
      ...loaded,
      services: loaded?.services?.length ? loaded.services : seedServices()
    });
    // A reload can return fewer services than the open tab's index, which
    // would otherwise leave the strip pointing at nothing.
    setActiveService(0);
  }, [data]);

  const services = extra.services ?? [];
  const activeItem = services[activeService];

  /** Update one page-level text field on the tab in view. */
  const setText = (field: keyof CmsExtraServicesText, value: string) => {
    setExtra((current) => ({
      ...current,
      text: {
        ...current.text,
        [locale]: { ...current.text?.[locale], [field]: value }
      }
    }));
    setSaved(false);
  };

  /** Update one service row's text on the tab in view. */
  const setServiceText = (
    index: number,
    field: "title" | "description",
    value: string
  ) => {
    setExtra((current) => ({
      ...current,
      services: (current.services ?? []).map((service, i) =>
        i === index
          ? {
              ...service,
              text: {
                ...service.text,
                [locale]: { ...service.text?.[locale], [field]: value }
              }
            }
          : service
      )
    }));
    setSaved(false);
  };

  const setServices = (next: CmsExtraService[]) => {
    setExtra((current) => ({ ...current, services: next }));
    setSaved(false);
  };

  /** Replace one service wholesale — used by the image list. */
  const updateService = (index: number, next: CmsExtraService) => {
    setServices(services.map((service, i) => (i === index ? next : service)));
  };

  const addService = () => {
    // No `key`: an added service has no built-in translation behind it and
    // must carry its own name. Focus follows it, since it opens empty.
    setServices([...services, { images: [] }]);
    setActiveService(services.length);
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
    // Step back rather than leaving the tab strip pointing past its own end,
    // which would render the empty state over a list that still has services.
    setActiveService((current) => Math.max(0, Math.min(current, services.length - 2)));
  };

  const moveService = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= services.length) return;
    const next = [...services];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved as CmsExtraService);
    setServices(next);
    // Stay on the service that moved, not on the position it left.
    setActiveService(target);
  };

  const textDraft = extra.text?.[locale] ?? {};

  const handleSave = async () => {
    setSaveError(null);
    setSaved(false);
    try {
      await updatePage.mutateAsync({
        title: "Extra services",
        published,
        content: { hero, extraServices: normalizeExtraServicesForSave(extra) }
      });
      setSaved(true);
    } catch {
      setSaveError(
        t(
          "Could not save the page. Please try again.",
          "تعذر حفظ الصفحة. حاول مرة أخرى."
        )
      );
    }
  };

  if (isError) {
    return (
      <div className="max-w-md rounded-lg border border-danger/30 bg-danger/5 p-5">
        <p className="text-sm text-danger">
          {t(
            "Could not load the extra services page.",
            "تعذر تحميل صفحة الخدمات الإضافية."
          )}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="tracking-nav mt-3 text-xs font-medium uppercase text-danger underline underline-offset-2"
        >
          {t("Try again", "حاول مرة أخرى")}
        </button>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LogoLoader />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-lg border border-line bg-card shadow-[0_18px_60px_rgba(25,25,25,0.04)]">
        <div className="flex flex-col gap-5 border-b border-line p-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              {t("Page workspace", "مساحة عمل الصفحة")}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <SettingsIcon className="h-7 w-7 text-accent" />
              <h1 className="text-2xl font-semibold text-primary">
                {t("Extra services", "الخدمات الإضافية")}
              </h1>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">
              {t(
                "Edit the headline, the intro, and each service's name, description and showcase images.",
                "عدّل العنوان والمقدمة، واسم كل خدمة ووصفها وصور أعمالها."
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={
                import.meta.env.VITE_PUBLIC_SITE_URL
                  ? `${import.meta.env.VITE_PUBLIC_SITE_URL}/${language}/extra-services`
                  : "#"
              }
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

      <CmsEditorLayout
        previewPageKey={EXTRA_SERVICES_PAGE_KEY}
        previewPath="/extra-services"
        previewContent={{ hero, extraServices: normalizeExtraServicesForSave(extra) }}
        previewLocale={language}
      >
        <div className="space-y-5">
          <div className="rounded-lg border border-line bg-card p-5">
            <div className="rounded-md border border-line px-4">
              <Toggle
                label={t("Published", "منشور")}
                description={t(
                  "When off, the page uses its built-in translated text.",
                  "عند الإيقاف، تستخدم الصفحة النص المترجم المدمج."
                )}
                checked={published}
                onChange={(value) => {
                  setPublished(value);
                  setSaved(false);
                }}
              />
            </div>
          </div>

          {/*
            One language at a time, for the page copy and every service row
            together — an admin translating the page works through it in one
            language rather than switching tabs per field.
          */}
          <div className="rounded-lg border border-line bg-card p-5">
            <div className="mb-5 border-b border-line pb-5">
              <p className="mb-1 text-sm font-medium text-primary">
                {t("Hero media", "وسائط البطل")}
              </p>
              <p className="text-xs leading-5 text-secondary">
                {t(
                  "Upload an image or video to use as this page's hero background.",
                  "ارفع صورة أو فيديو لاستخدامه كخلفية لقسم البطل في هذه الصفحة."
                )}
              </p>
            </div>
            <HeroMediaPicker
              pageKey={EXTRA_SERVICES_PAGE_KEY}
              value={hero}
              onChange={(next) => {
                setHero(next);
                setSaved(false);
              }}
            />
          </div>

          <div className="rounded-lg border border-line bg-card p-5">
            <LanguageTabs
              active={locale}
              onChange={setLocale}
              statusFor={(value) => extraServicesTranslationStatus(extra, value)}
            />

            <div className="mt-5 grid gap-4">
              <TextField
                label={t("Kicker", "النص التمهيدي")}
                name="extraServicesKicker"
                value={textDraft.kicker ?? ""}
                onChange={(event) => setText("kicker", event.target.value)}
                placeholder={t("Extra services", "الخدمات الإضافية")}
                hint={t(
                  "Leave any field blank to keep the site's built-in text.",
                  "اترك أي حقل فارغًا للإبقاء على النص المدمج في الموقع."
                )}
                dir={locale === "ar" ? "rtl" : "ltr"}
              />
              <TextField
                label={t("Title", "العنوان")}
                name="extraServicesTitle"
                value={textDraft.title ?? ""}
                onChange={(event) => setText("title", event.target.value)}
                dir={locale === "ar" ? "rtl" : "ltr"}
              />
              <TextareaField
                label={t("Subtitle", "العنوان الفرعي")}
                name="extraServicesSubtitle"
                value={textDraft.subtitle ?? ""}
                onChange={(event) => setText("subtitle", event.target.value)}
                dir={locale === "ar" ? "rtl" : "ltr"}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label={t("Button label", "نص الزر")}
                  name="extraServicesCta"
                  value={textDraft.cta ?? ""}
                  onChange={(event) => setText("cta", event.target.value)}
                  dir={locale === "ar" ? "rtl" : "ltr"}
                />
                <TextField
                  label={t("Section label", "تسمية القسم")}
                  name="extraServicesWorkLabel"
                  value={textDraft.workLabel ?? ""}
                  onChange={(event) => setText("workLabel", event.target.value)}
                  placeholder={t("Selected work", "أعمال مختارة")}
                  dir={locale === "ar" ? "rtl" : "ltr"}
                />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-line bg-card">
            {/*
              One service at a time. Stacked, five services ran to several
              screens and the page-level copy above scrolled out of reach; the
              tab strip keeps the whole set in view and reachable in one click.
            */}
            <div
              role="tablist"
              aria-label={t("Services", "الخدمات")}
              className="flex min-w-0 flex-wrap items-center gap-1.5 border-b border-line px-5"
            >
              {services.map((service, index) => {
                const selected = index === activeService;
                /**
                 * A row needing attention: added by the admin and still
                 * untitled in this language, so the site drops it rather than
                 * render a headless section. Flagged here because the field
                 * that fixes it is now a tab away.
                 */
                const needsTitle =
                  !service.key && !service.text?.[locale]?.title?.trim();

                return (
                  <button
                    key={service.key ?? `service-${index}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveService(index)}
                    className={`-mb-px flex h-12 items-center gap-2 whitespace-nowrap border-b-2 px-4 text-sm transition-colors ${
                      selected
                        ? "border-accent font-medium text-primary"
                        : "border-transparent text-secondary hover:text-primary"
                    }`}
                  >
                    {rowLabel(service, index, language, t)}
                    {needsTitle ? (
                      <span
                        title={t("Needs a name", "بحاجة إلى اسم")}
                        className="h-1.5 w-1.5 rounded-full bg-danger"
                      />
                    ) : null}
                    {service.images?.length ? (
                      <span
                        className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                          selected ? "bg-accent/15 text-accent" : "bg-base text-secondary"
                        }`}
                      >
                        {service.images.length}
                      </span>
                    ) : null}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={addService}
                className="ms-auto text-xs font-medium uppercase text-primary underline underline-offset-2 hover:text-accent"
              >
                {t("Add service", "إضافة خدمة")}
              </button>
            </div>

            {activeItem ? (
              <div className="grid gap-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
                    {rowLabel(activeItem, activeService, language, t)}
                  </p>
                  {/* Reordering moves the tab itself, so the arrows point the
                      way the strip runs rather than up and down a list. */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => moveService(activeService, -1)}
                      disabled={activeService === 0}
                      aria-label={t("Move earlier", "تحريك للأمام")}
                      className="px-1 text-xs text-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <span aria-hidden>&#8592;</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveService(activeService, 1)}
                      disabled={activeService === services.length - 1}
                      aria-label={t("Move later", "تحريك للخلف")}
                      className="px-1 text-xs text-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <span aria-hidden>&#8594;</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeService(activeService)}
                      className="text-xs font-medium uppercase text-danger underline underline-offset-2"
                    >
                      {t("Remove", "إزالة")}
                    </button>
                  </div>
                </div>

                <TextField
                  label={t("Name", "الاسم")}
                  name={`extraServiceTitle-${activeService}`}
                  value={activeItem.text?.[locale]?.title ?? ""}
                  onChange={(event) =>
                    setServiceText(activeService, "title", event.target.value)
                  }
                  hint={
                    activeItem.key
                      ? t(
                          "Blank keeps the built-in translated name.",
                          "اتركه فارغًا للإبقاء على الاسم المترجم المدمج."
                        )
                      : t(
                          "Required — an added service has no built-in name.",
                          "مطلوب — الخدمة المضافة ليس لها اسم مدمج."
                        )
                  }
                  dir={locale === "ar" ? "rtl" : "ltr"}
                />

                <TextareaField
                  label={t("Description", "الوصف")}
                  name={`extraServiceDescription-${activeService}`}
                  value={activeItem.text?.[locale]?.description ?? ""}
                  onChange={(event) =>
                    setServiceText(activeService, "description", event.target.value)
                  }
                  dir={locale === "ar" ? "rtl" : "ltr"}
                />

                {/*
                  Images are shared across languages — the same photograph
                  illustrates the work whichever language it is described in —
                  so this list stays outside the locale tabs.
                */}
                <Repeater<string>
                  label={t("Showcase images", "صور الأعمال")}
                  items={activeItem.images ?? []}
                  onChange={(images) =>
                    updateService(activeService, { ...activeItem, images })
                  }
                  createItem={() => ""}
                  addLabel={t("Add image", "إضافة صورة")}
                  emptyHint={
                    activeItem.key
                      ? t(
                          "No images — the site shows this service's built-in ones.",
                          "لا توجد صور — سيعرض الموقع الصور المدمجة لهذه الخدمة."
                        )
                      : t("No images yet.", "لا توجد صور بعد.")
                  }
                  renderItem={(image, imageIndex, updateImage) => (
                    <ImageUploadField
                      pageKey={EXTRA_SERVICES_PAGE_KEY}
                      label={t(`Image ${imageIndex + 1}`, `صورة ${imageIndex + 1}`)}
                      value={image}
                      onChange={updateImage}
                      name={`extraServiceImage-${activeService}-${imageIndex}`}
                    />
                  )}
                />
              </div>
            ) : (
              <p className="p-5 text-sm text-secondary">
                {t(
                  "No services — the site will show its five built-in ones.",
                  "لا توجد خدمات — سيعرض الموقع الخدمات الخمس المدمجة."
                )}
              </p>
            )}
          </div>

          {saveError ? <p className="text-sm text-danger">{saveError}</p> : null}
          {saved && !updatePage.isPending ? (
            <p className="text-sm text-success">
              {t("Content saved.", "تم حفظ المحتوى.")}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button
              type="button"
              loading={updatePage.isPending}
              onClick={() => void handleSave()}
            >
              {t("Save page", "حفظ الصفحة")}
            </Button>
          </div>
        </div>
      </CmsEditorLayout>
    </div>
  );
}
