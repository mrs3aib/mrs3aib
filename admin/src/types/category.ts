/**
 * Gallery categories a session can belong to. Must stay in sync with the
 * `SessionCategory` enum in the server's schema.prisma.
 */
export const SESSION_CATEGORIES = [
  "weddings",
  "companies",
  "restaurants",
  "events",
  "products",
  "realEstate",
  "drone",
  "cinematicVideo"
] as const;

export type SessionCategory = (typeof SESSION_CATEGORIES)[number];

/** Bilingual labels for the category dropdown. */
export const CATEGORY_LABELS: Record<SessionCategory, { en: string; ar: string }> = {
  weddings: { en: "Weddings", ar: "زواجات" },
  companies: { en: "Companies", ar: "الشركات" },
  restaurants: { en: "Restaurants & Cafes", ar: "المطاعم والمقاهي" },
  events: { en: "Events", ar: "الفعاليات" },
  products: { en: "Products", ar: "المنتجات" },
  realEstate: { en: "Real Estate", ar: "العقارات" },
  drone: { en: "Drone", ar: "التصوير الجوي" },
  cinematicVideo: { en: "Cinematic Video", ar: "الفيديو السينمائي" }
};
