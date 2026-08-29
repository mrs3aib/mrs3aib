"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [isPending, startTransition] = useTransition();

  const switchTo = (next: Locale) => {
    if (next === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next, scroll: false });
    });
  };

  return (
    <div
      aria-label={t("language")}
      className={`flex items-center gap-2 text-sm transition-opacity duration-300 ${
        isPending ? "opacity-50" : "opacity-100"
      }`}
    >
      <button
        type="button"
        onClick={() => switchTo("en")}
        className={`font-medium transition-colors duration-300 ${
          locale === "en" ? "text-primary" : "text-secondary hover:text-primary"
        }`}
      >
        EN
      </button>
      <span className="text-white/20">|</span>
      <button
        type="button"
        onClick={() => switchTo("ar")}
        className={`font-medium transition-colors duration-300 ${
          locale === "ar" ? "text-primary" : "text-secondary hover:text-primary"
        }`}
      >
        العربية
      </button>
    </div>
  );
}
