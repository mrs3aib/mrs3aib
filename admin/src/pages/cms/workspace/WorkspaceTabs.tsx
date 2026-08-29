import type { ComponentType } from "react";
import { useLanguage } from "@/i18n/languageContext";

export type WorkspaceTabKey = "content" | "sessions" | "media";

export type WorkspaceTabDef = {
  key: WorkspaceTabKey;
  labelEn: string;
  labelAr: string;
  icon: ComponentType<{ className?: string }>;
  /** Shown as a count pill next to the label. */
  badge?: number;
};

export function WorkspaceTabs({
  tabs,
  active,
  onChange
}: {
  tabs: WorkspaceTabDef[];
  active: WorkspaceTabKey;
  onChange: (key: WorkspaceTabKey) => void;
}) {
  const { t } = useLanguage();

  return (
    <div
      role="tablist"
      aria-label={t("Page sections", "أقسام الصفحة")}
      className="flex min-w-0 flex-wrap gap-1.5 border-b border-line px-5"
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.key)}
            className={`-mb-px flex h-12 items-center gap-2.5 whitespace-nowrap border-b-2 px-4 text-sm transition-colors ${
              selected
                ? "border-accent font-medium text-primary"
                : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            <tab.icon className={`h-4 w-4 shrink-0 ${selected ? "text-accent" : ""}`} />
            {t(tab.labelEn, tab.labelAr)}
            {typeof tab.badge === "number" ? (
              <span
                className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                  selected ? "bg-accent/15 text-accent" : "bg-base text-secondary"
                }`}
              >
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
