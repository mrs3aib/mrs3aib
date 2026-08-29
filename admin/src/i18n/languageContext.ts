import { createContext, useContext } from "react";

export type AdminLanguage = "ar" | "en";

export type LanguageContextValue = {
  language: AdminLanguage;
  setLanguage: (language: AdminLanguage) => void;
  toggleLanguage: () => void;
  t: (english: string, arabic: string) => string;
};

export const LanguageContext = createContext<LanguageContextValue | null>(null);

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
