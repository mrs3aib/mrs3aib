import { useLanguage } from "./languageContext";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex overflow-hidden rounded-full border border-line bg-card text-xs font-medium">
      <button
        type="button"
        onClick={() => setLanguage("ar")}
        className={`px-3 py-1.5 transition-colors ${
          language === "ar" ? "bg-accent text-base" : "text-secondary hover:text-primary"
        }`}
      >
        عربي
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`px-3 py-1.5 transition-colors ${
          language === "en" ? "bg-accent text-base" : "text-secondary hover:text-primary"
        }`}
      >
        EN
      </button>
    </div>
  );
}
