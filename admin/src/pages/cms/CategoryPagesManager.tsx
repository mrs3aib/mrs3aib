import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { HeroFields } from "./HeroFields";
import { LanguageTabs } from "./SectionEditors";
import {
  WorkspaceTabs,
  type WorkspaceTabDef,
  type WorkspaceTabKey
} from "./workspace/WorkspaceTabs";
import { CategorySessionsTab } from "./workspace/CategorySessionsTab";
import { CategoryMediaTab } from "./workspace/CategoryMediaTab";
import { LogoLoader } from "@/components/LogoLoader";
import {
  CalendarIcon,
  EyeIcon,
  ImageIcon,
  SaveIcon,
  UploadIcon
} from "@/components/icons";
import { useLanguage } from "@/i18n/languageContext";
import { usePageContentQuery, useUpdatePageContent } from "@/hooks/usePageContent";
import { CmsEditorLayout } from "@/components/CmsEditorLayout";
import { useSessionsQuery } from "@/hooks/useSessions";
import {
  CATEGORY_LABELS,
  SESSION_CATEGORIES,
  type SessionCategory
} from "@/types/category";
import type { PhotoSession } from "@/types/session";
import { cn } from "@/utils/cn";
import {
  DEFAULT_CMS_LOCALE,
  migrateLegacySectionText,
  sectionTranslationStatus,
  type CmsCategory,
  type CmsHero,
  type CmsLocale,
  type HomepageCmsContent
} from "@/types/pageContent";

const DEFAULT_CATEGORIES: CmsCategory[] = SESSION_CATEGORIES.map((id) => ({
  id,
  label: CATEGORY_LABELS[id].en
}));

const TAB_KEYS: WorkspaceTabKey[] = ["content", "sessions", "media"];

/** The tab the workspace opens on when the URL names none — sessions are the
 * day-to-day work, so the admin lands there rather than on page content. */
const DEFAULT_TAB: WorkspaceTabKey = "sessions";

function isSessionCategory(value: string): value is SessionCategory {
  return SESSION_CATEGORIES.includes(value as SessionCategory);
}

function isTabKey(value: string | null): value is WorkspaceTabKey {
  return value !== null && TAB_KEYS.includes(value as WorkspaceTabKey);
}

function Card({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-line bg-card shadow-[0_18px_60px_rgba(25,25,25,0.04)] ${className}`}
    >
      {children}
    </section>
  );
}

export default function CategoryPagesManager() {
  const { categoryId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, language } = useLanguage();
  const [saved, setSaved] = useState(false);
  const [locale, setLocale] = useState<CmsLocale>(DEFAULT_CMS_LOCALE);
  const [mediaSessionId, setMediaSessionId] = useState("");

  const { data: categoriesData } = usePageContentQuery("categories");

  const categories = useMemo(() => {
    const list = (categoriesData?.content as HomepageCmsContent | undefined)?.categories;
    return list?.length ? list : DEFAULT_CATEGORIES;
  }, [categoriesData?.content]);

  const selected =
    categories.find((category) => category.id === categoryId)?.id ??
    categories[0]?.id ??
    DEFAULT_CATEGORIES[0]!.id;
  const activeCategory = categories.find((category) => category.id === selected);
  const sessionCategory = isSessionCategory(selected) ? selected : undefined;
  const localizedCategoryLabel = sessionCategory
    ? CATEGORY_LABELS[sessionCategory][language]
    : (activeCategory?.label ?? selected);

  // The tab lives in the URL so a page can be linked to directly and survives
  // a refresh without dropping the admin back on the default tab.
  const tabParam = searchParams.get("tab");
  const activeTab: WorkspaceTabKey = isTabKey(tabParam) ? tabParam : DEFAULT_TAB;

  const setActiveTab = useCallback(
    (tab: WorkspaceTabKey) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          // The default tab is the bare URL, so it carries no query parameter.
          if (tab === DEFAULT_TAB) next.delete("tab");
          else next.set("tab", tab);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const pageKey = `category-${selected}`;
  const { data, isPending, isError, refetch } = usePageContentQuery(pageKey);
  const updatePage = useUpdatePageContent(pageKey);
  const { data: sessionsData, isPending: sessionsPending } = useSessionsQuery({
    page: 1,
    pageSize: 1,
    ...(sessionCategory ? { category: sessionCategory } : {})
  });

  const initial = useMemo(
    () => (data?.content ?? {}) as HomepageCmsContent,
    [data?.content]
  );
  const [hero, setHero] = useState<CmsHero>(initial.hero ?? {});
  const [pageHidden, setPageHidden] = useState(false);

  useEffect(() => {
    setHero(initial.hero ?? {});
    setPageHidden(Boolean(initial.pageHidden));
    setSaved(false);
  }, [initial]);

  // A session chosen on one page must not leak into the next one.
  useEffect(() => {
    setMediaSessionId("");
  }, [selected]);

  const previewHref = useMemo(() => {
    const base = import.meta.env.VITE_PUBLIC_SITE_URL;
    if (!base) return "#";
    return `${base.replace(/\/$/, "")}/category/${selected}`;
  }, [selected]);

  const handleSave = async () => {
    await updatePage.mutateAsync({
      title: data?.title ?? activeCategory?.label ?? selected,
      published: data?.published ?? true,
      content: {
        ...initial,
        hero: migrateLegacySectionText(hero, "hero"),
        pageHidden
      }
    });
    setSaved(true);
  };

  const handleCommitHeroMedia = async (nextHero: CmsHero) => {
    setHero(nextHero);
    await updatePage.mutateAsync({
      title: data?.title ?? activeCategory?.label ?? selected,
      published: data?.published ?? true,
      content: {
        ...initial,
        hero: migrateLegacySectionText(nextHero, "hero"),
        pageHidden
      }
    });
    setSaved(true);
  };

  const openMediaFor = (session: PhotoSession) => {
    setMediaSessionId(session.id);
    setActiveTab("media");
  };

  const tabs: WorkspaceTabDef[] = [
    {
      key: "sessions",
      labelEn: "Sessions",
      labelAr: "الجلسات",
      icon: CalendarIcon,
      ...(sessionsPending ? {} : { badge: sessionsData?.total ?? 0 })
    },
    { key: "media", labelEn: "Media", labelAr: "الوسائط", icon: UploadIcon },
    { key: "content", labelEn: "Content", labelAr: "المحتوى", icon: ImageIcon }
  ];

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-5 border-b border-line p-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              {t("Page workspace", "مساحة عمل الصفحة")}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <ImageIcon className="h-7 w-7 text-accent" />
              <h1 className={cn("text-2xl font-semibold", "text-primary")}>
                {localizedCategoryLabel}
              </h1>
            </div>
            <p className={cn("mt-2 max-w-2xl text-sm leading-6", "text-secondary")}>
              {t(
                "Edit this page's content, manage its sessions, and upload their media — all in one place.",
                "عدّل محتوى هذه الصفحة وأدر جلساتها وارفع وسائطها، كل ذلك في مكان واحد."
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setPageHidden((current) => !current);
                setSaved(false);
              }}
              title={t("Save to apply visibility changes", "احفظ لتطبيق تغييرات الظهور")}
              className={cn(
                "flex h-11 shrink-0 items-center gap-3 whitespace-nowrap rounded-lg border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                pageHidden
                  ? "border-line bg-base text-secondary hover:border-accent hover:text-primary"
                  : "border-success/20 bg-success/10 text-success hover:bg-success/15"
              )}
            >
              <span
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  pageHidden ? "bg-secondary/25" : "bg-success"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    pageHidden ? "inset-0.5" : "inset-s-4.5"
                  }`}
                />
              </span>
              {pageHidden
                ? t("Hidden from site", "مخفية من الموقع")
                : t("Visible on site", "ظاهرة في الموقع")}
            </button>
            <a
              href={previewHref}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-line bg-card px-4 text-sm transition-colors hover:border-accent hover:bg-base/60",
                "text-secondary hover:text-primary"
              )}
            >
              <EyeIcon className="h-4 w-4 shrink-0" />
              {t("Preview page", "معاينة الصفحة")}
            </a>
            {activeTab === "content" ? (
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
            ) : null}
          </div>
        </div>

        <WorkspaceTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      </Card>

      {saved && activeTab === "content" ? (
        <p
          className={cn(
            "rounded-lg border border-success/20 bg-success/10 px-4 py-2.5 text-sm",
            "text-success"
          )}
        >
          {t("Page saved.", "تم حفظ الصفحة.")}
        </p>
      ) : null}
      {isError ? (
        <Card className="p-5">
          <p className={cn("text-sm", "text-danger")}>
            {t("Could not load this page.", "تعذر تحميل هذه الصفحة.")}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className={cn(
              "mt-3 text-xs font-medium underline underline-offset-2",
              "text-danger"
            )}
          >
            {t("Try again", "حاول مرة أخرى")}
          </button>
        </Card>
      ) : null}

      <div className="min-w-0 space-y-5">
        {/*
          Only the content tab gets a preview. The sessions and media tabs
          manage what the gallery draws from rather than editing this page's
          own copy, so a preview of it would not reflect what is being changed.
        */}
        {activeTab === "content" ? (
          isPending ? (
            <Card className="flex min-h-80 items-center justify-center">
              <LogoLoader />
            </Card>
          ) : (
            <CmsEditorLayout
              previewPageKey={pageKey}
              previewPath={`/category/${selected}`}
              previewContent={{ hero }}
              previewLocale={locale}
            >
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <ImageIcon className="h-5 w-5 shrink-0 text-accent" />
                <div>
                  <h2 className={cn("text-base font-semibold", "text-primary")}>
                    {t("Edit page content", "تعديل محتوى الصفحة")}
                  </h2>
                  <p className={cn("mt-1 text-xs", "text-secondary")}>
                    {t(
                      "Hero text, CTA, and cover media for this page.",
                      "نص الهيرو والزر والصورة الرئيسية لهذه الصفحة."
                    )}
                  </p>
                </div>
              </div>

              <LanguageTabs
                active={locale}
                onChange={setLocale}
                statusFor={(l) => sectionTranslationStatus(hero, "hero", l)}
              />

              <div className="mt-4 grid gap-4">
                <HeroFields
                  value={hero}
                  onChange={setHero}
                  variant="category"
                  locale={locale}
                  pageKey={pageKey}
                  onCommitMedia={handleCommitHeroMedia}
                />
              </div>
            </Card>
            </CmsEditorLayout>
          )
        ) : null}

        {activeTab === "sessions" ? (
          <Card className="p-5">
            {sessionCategory ? (
              <CategorySessionsTab
                category={sessionCategory}
                onOpenMedia={openMediaFor}
              />
            ) : (
              <p className={cn("py-10 text-center text-sm", "text-secondary")}>
                {t(
                  "This page has no session category attached to it.",
                  "لا ترتبط هذه الصفحة بأي تصنيف جلسات."
                )}
              </p>
            )}
          </Card>
        ) : null}

        {activeTab === "media" ? (
          <Card className="p-5">
            {sessionCategory ? (
              <CategoryMediaTab
                category={sessionCategory}
                sessionId={mediaSessionId}
                onSessionChange={setMediaSessionId}
                onAddSession={() => setActiveTab("sessions")}
              />
            ) : (
              <p className={cn("py-10 text-center text-sm", "text-secondary")}>
                {t(
                  "This page has no session category attached to it.",
                  "لا ترتبط هذه الصفحة بأي تصنيف جلسات."
                )}
              </p>
            )}
          </Card>
        ) : null}
      </div>
    </div>
  );
}
