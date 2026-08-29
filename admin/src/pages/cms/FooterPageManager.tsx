import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { LogoLoader } from "@/components/LogoLoader";
import { Toggle } from "@/components/Toggle";
import { ClipboardIcon, EyeIcon, SaveIcon } from "@/components/icons";
import { useLanguage } from "@/i18n/languageContext";
import { usePageContentQuery, useUpdatePageContent } from "@/hooks/usePageContent";
import {
  normalizeFooterForSave,
  type CmsFooter,
  type HomepageCmsContent
} from "@/types/pageContent";
import { FooterEditor } from "./SectionEditors";
import { CmsEditorLayout } from "@/components/CmsEditorLayout";

const FOOTER_PAGE_KEY = "footer";

/** Owns the site-wide footer record and nothing else. */
export default function FooterPageManager() {
  const { t, language } = useLanguage();
  const { data, isPending, isError, refetch } = usePageContentQuery(FOOTER_PAGE_KEY);
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
        content: { footer: normalizeFooterForSave(footer) }
      });
      setSaved(true);
    } catch {
      setSaveError("Could not save footer content. Please try again.");
    }
  };

  if (isError) {
    return (
      <div>
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
              <ClipboardIcon className="h-7 w-7 text-accent" />
              <h1 className="text-2xl font-semibold text-primary">{t("Footer", "التذييل")}</h1>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">
              {t(
                "Manage the contact details, links, newsletter, and social accounts shown across the site.",
                "أدر بيانات التواصل والروابط والنشرة البريدية وحسابات التواصل الاجتماعي الظاهرة في الموقع."
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
              {updatePage.isPending ? t("Saving...", "جارٍ الحفظ...") : t("Save & publish", "حفظ ونشر")}
            </button>
          </div>
        </div>
      </section>
      {/*
        Previewed against the homepage: the footer renders on every page, and
        the homepage is the one an admin recognises at a glance.
      */}
      <CmsEditorLayout
        previewPageKey={FOOTER_PAGE_KEY}
        previewPath="/"
        previewContent={{ footer: normalizeFooterForSave(footer) }}
        previewLocale={language}
      >
      <div className="rounded-lg border border-line bg-card p-5">
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
          <Button type="button" loading={updatePage.isPending} onClick={() => void handleSave()}>
            Save footer
          </Button>
        </div>
      </div>
      </CmsEditorLayout>
    </div>
  );
}
