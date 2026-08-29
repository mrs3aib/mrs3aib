import { useEffect, useState, type ReactNode } from "react";
import { CmsPreviewPanel } from "./CmsPreviewPanel";
import { useLanguage } from "@/i18n/languageContext";

const STORAGE_KEY = "s3aib.cms.previewOpen";

/**
 * Splits a CMS editor into the form and a live preview of the public page.
 *
 * The preview is collapsible and the choice is remembered: it is genuinely
 * useful while writing copy and simply in the way while wiring up sessions or
 * uploading media, and that preference tends to hold across visits.
 *
 * Below `xl` the panel is hidden entirely rather than stacked. A preview
 * squeezed under the form is too small to judge a layout by, and it would push
 * the form itself off the first screen on the laptops this dashboard is used
 * on.
 */
export function CmsEditorLayout({
  previewPageKey,
  previewPath,
  previewContent,
  previewLocale,
  children
}: {
  previewPageKey: string;
  previewPath: string;
  previewContent: unknown;
  previewLocale: string;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(() => {
    try {
      // Defaults to on: the preview is the reason this layout exists, and a
      // first-time user should see it without discovering a toggle.
      return window.localStorage.getItem(STORAGE_KEY) !== "0";
    } catch {
      // Private mode and blocked site data both throw here.
      return true;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
    } catch {
      /* preference is a convenience; ignore storage failures */
    }
  }, [open]);

  return (
    <div className="space-y-4">
      <div className="hidden justify-end xl:flex">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-lg border border-line px-3 py-1.5 text-xs text-secondary transition-colors hover:bg-base"
        >
          {open
            ? t("Hide preview", "إخفاء المعاينة")
            : t("Show preview", "إظهار المعاينة")}
        </button>
      </div>

      <div
        className={
          open
            ? "grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(28rem,42%)]"
            : "min-w-0"
        }
      >
        <div className="min-w-0">{children}</div>

        {open ? (
          // Sticky so the preview stays in view while the form scrolls past it.
          <div className="hidden xl:block">
            <div className="sticky top-5 h-[calc(100vh-8rem)]">
              <CmsPreviewPanel
                pageKey={previewPageKey}
                path={previewPath}
                content={previewContent}
                locale={previewLocale}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
