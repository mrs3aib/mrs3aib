export type HeroMediaType = "image" | "video";

export type CmsCategory = {
  id: string;
  label: string;
};

/** Hero text, authored per language. Media lives on `CmsHero` and is shared. */
export type CmsHeroText = {
  studio?: string;
  wordmark?: string;
  kicker?: string;
  title?: string;
  subtitle?: string;
  cta?: string;
  ctaSecondary?: string;
};

export type CmsHero = CmsHeroText & {
  mediaType?: HeroMediaType;
  mediaUrl?: string;
  posterUrl?: string;
  text?: Localized<CmsHeroText>;
};

/**
 * Homepage sections an admin can hide, in site render order. The hero is
 * deliberately absent: it carries the category navigation, so hiding it would
 * strip the site's primary nav.
 */
export const HIDEABLE_SECTIONS = [
  "latestWeddings",
  "gallery",
  "about",
  "story",
  "process",
  "testimonials",
  "instagram",
  "clients",
  "contact"
] as const;

export type HideableSection = (typeof HIDEABLE_SECTIONS)[number];

/** How the Latest Weddings section chooses what to show. */
export type LatestWeddingsMode = "auto" | "manual";

/**
 * The category "Latest Weddings" draws from. Matches the `weddings` id in
 * web/lib/data.ts and the `SessionCategory` enum in the Prisma schema.
 */
export const WEDDINGS_CATEGORY_ID = "weddings";

/** Shown when the section has no explicit count. */
export const LATEST_WEDDINGS_DEFAULT_COUNT = 4;

export type HomepageCmsContent = {
  categories?: CmsCategory[];
  hero?: CmsHero;
  /**
   * Sections switched off in the CMS. Absent or false means visible, so an
   * existing record with no flags keeps rendering everything.
   */
  hiddenSections?: Partial<Record<HideableSection, boolean>>;
  /**
   * Category pages only: when true the page 404s and the category is dropped
   * from every category list on the site.
   */
  pageHidden?: boolean;
  about?: {
    label?: string;
    title?: string;
    body?: string;
    cta?: string;
    imageUrl?: string;
    text?: Localized<{ label?: string; title?: string; body?: string; cta?: string }>;
  };
  gallery?: {
    title?: string;
    /**
     * Hand-picked published sessions, in render order. Preferred over `items`
     * when non-empty: the site resolves each id against the backend, so a
     * session's cover and title stay current without re-saving the page.
     */
    sessionIds?: string[];
    /**
     * Manually entered images. Still read when `sessionIds` is empty, so
     * records saved before the picker existed keep rendering.
     */
    items?: { imageUrl: string; title?: string; category?: string }[];
    text?: Localized<{ title?: string }>;
  };
  /**
   * The weddings showcase below the hero.
   *
   * `mode` decides where the items come from: "auto" tracks the newest
   * published wedding sessions on its own, while "manual" renders exactly
   * `sessionIds`, in that order. Auto is the default so the section fills
   * itself the moment a wedding session is published.
   */
  latestWeddings?: {
    label?: string;
    title?: string;
    subtitle?: string;
    mode?: LatestWeddingsMode;
    /** How many to show in "auto" mode. */
    count?: number;
    /** The chosen sessions in "manual" mode, in render order. */
    sessionIds?: string[];
    text?: Localized<{ label?: string; title?: string; subtitle?: string }>;
  };
  story?: {
    label?: string;
    title?: string;
    intro?: string;
    images?: string[];
    chapters?: { number?: string; title?: string; text?: string }[];
    text?: Localized<{ label?: string; title?: string; intro?: string }>;
  };
  process?: {
    label?: string;
    title?: string;
    steps?: { number?: string; title?: string; text?: string }[];
    text?: Localized<{ label?: string; title?: string }>;
  };
  testimonials?: {
    label?: string;
    title?: string;
    items?: { quote?: string; name?: string; role?: string }[];
    text?: Localized<{ label?: string; title?: string }>;
  };
  instagram?: {
    label?: string;
    title?: string;
    subtitle?: string;
    follow?: string;
    url?: string;
    images?: string[];
    text?: Localized<{
      label?: string;
      title?: string;
      subtitle?: string;
      follow?: string;
    }>;
  };
  contact?: {
    label?: string;
    title?: string;
    subtitle?: string;
    email?: string;
    instagram?: string;
    instagramUrl?: string;
    whatsapp?: string;
    whatsappUrl?: string;
    book?: string;
    text?: Localized<{
      label?: string;
      title?: string;
      subtitle?: string;
      book?: string;
    }>;
  };
  clients?: {
    /**
     * Both fields are optional because this is JSON: a record saved before a
     * field existed, or a row the admin added and left half-filled, simply has
     * it missing. Renderers drop entries without both.
     */
    items?: { name?: string; logoUrl?: string }[];
  };
  footer?: CmsFooter;
};

// Arabic first: it is the site's default locale (see the web routing config),
// so it leads the editor's language tabs. Order is presentational only — every
// consumer iterates this list rather than indexing into it.
export const CMS_LOCALES = ["ar", "en"] as const;

export type CmsLocale = (typeof CMS_LOCALES)[number];

/**
 * The language tab every CMS editor opens on.
 *
 * Named rather than repeated at each `useState` so the editors cannot drift
 * apart the way they did when each defaulted to English independently.
 */
export const DEFAULT_CMS_LOCALE: CmsLocale = "ar";

/** A value authored once per language. */
export type Localized<T> = Partial<Record<CmsLocale, T>>;

/**
 * Which fields of each section hold reader-facing text.
 *
 * Everything absent here is shared across languages — media URLs, links, and
 * the repeater arrays (gallery items, story chapters, process steps,
 * testimonials), whose per-entry text is not split by locale.
 *
 * Keep in sync with the same map in web/lib/cms.ts.
 */
export const TRANSLATABLE_FIELDS = {
  hero: ["studio", "wordmark", "kicker", "title", "subtitle", "cta", "ctaSecondary"],
  about: ["label", "title", "body", "cta"],
  gallery: ["title"],
  latestWeddings: ["label", "title", "subtitle"],
  story: ["label", "title", "intro"],
  process: ["label", "title"],
  testimonials: ["label", "title"],
  instagram: ["label", "title", "subtitle", "follow"],
  contact: ["label", "title", "subtitle", "book"]
} as const;

export type TranslatableSection = keyof typeof TRANSLATABLE_FIELDS;

type MaybeLocalized = {
  text?: Localized<Record<string, string | undefined>>;
};

/** How many of a section's text fields are filled for a locale. */
export function sectionTranslationStatus(
  section: object | undefined,
  sectionKey: TranslatableSection,
  locale: CmsLocale
): { filled: number; total: number; complete: boolean; empty: boolean } {
  const text = (section as MaybeLocalized | undefined)?.text?.[locale] ?? {};
  const fields = TRANSLATABLE_FIELDS[sectionKey];
  const filled = fields.filter((field) => text[field]?.trim()).length;

  return {
    filled,
    total: fields.length,
    complete: filled === fields.length,
    empty: filled === 0
  };
}

/**
 * Combined status across several sections — used by the page-level language
 * tabs, where one badge summarises the whole page.
 */
export function pageTranslationStatus(
  sections: { section: object | undefined; key: TranslatableSection }[],
  locale: CmsLocale
): { filled: number; total: number; complete: boolean; empty: boolean } {
  let filled = 0;
  let total = 0;

  for (const { section, key } of sections) {
    const status = sectionTranslationStatus(section, key, locale);
    filled += status.filled;
    total += status.total;
  }

  return { filled, total, complete: total > 0 && filled === total, empty: filled === 0 };
}

/**
 * Read one section's fields for the tab in view, falling back to the flat
 * pre-translation values on the English tab so an old record opens with its
 * existing copy rather than blank.
 */
export function sectionDraftFor<T extends object>(
  section: T | undefined,
  sectionKey: TranslatableSection,
  locale: CmsLocale
): Record<string, string> {
  const source = (section ?? {}) as Record<string, unknown> & MaybeLocalized;
  const translated = source.text?.[locale] ?? {};
  const draft: Record<string, string> = {};

  for (const field of TRANSLATABLE_FIELDS[sectionKey]) {
    const legacy = locale === "en" ? source[field] : undefined;
    draft[field] =
      translated[field] ?? (typeof legacy === "string" ? legacy : "") ?? "";
  }

  return draft;
}

/**
 * Move pre-translation flat text into `text.en` and drop the flat copy, so the
 * two cannot diverge once the English tab owns the content.
 */
export function migrateLegacySectionText<T extends object>(
  section: T,
  sectionKey: TranslatableSection
): T {
  const source = section as Record<string, unknown> & MaybeLocalized;
  const next: Record<string, unknown> = { ...source };
  const en: Record<string, string | undefined> = { ...(source.text?.en ?? {}) };
  let migrated = false;

  for (const field of TRANSLATABLE_FIELDS[sectionKey]) {
    const legacy = source[field];
    if (typeof legacy !== "string" || !legacy.trim()) continue;
    if (!en[field]?.trim()) en[field] = legacy;
    delete next[field];
    migrated = true;
  }

  if (!migrated) return section;

  return { ...next, text: { ...source.text, en } } as T;
}

/**
 * Footer text that reads differently in each language.
 *
 * Kept apart from the shared fields below so a translation covers exactly the
 * strings a reader sees, and nothing else.
 */
export type CmsFooterText = {
  newsletterTitle?: string;
  newsletterText?: string;
  quickLinks?: string;
  contactTitle?: string;
  location?: string;
  followTitle?: string;
};

/** The text fields a locale must fill to count as fully translated. */
export const FOOTER_TEXT_FIELDS = [
  "newsletterTitle",
  "newsletterText",
  "quickLinks",
  "contactTitle",
  "location",
  "followTitle"
] as const satisfies readonly (keyof CmsFooterText)[];

/**
 * Site-wide footer content. Stored under its own `footer` page key rather than
 * on `home`, because the footer renders on every page.
 *
 * Text lives under `text.en` / `text.ar`. Phone, email and the social URLs are
 * deliberately shared: they are the same string in every language, and
 * duplicating them would let the two locales drift apart.
 *
 * The flat `newsletterTitle`-style fields are what this type used to be. They
 * are still read as a fallback so records saved before translations existed
 * keep rendering; new saves write `text` instead.
 */
export type CmsFooter = CmsFooterText & {
  text?: Localized<CmsFooterText>;
  phone?: string;
  email?: string;
  /** Blank or missing means "hide this icon" — an empty href was a dead link. */
  social?: {
    instagramUrl?: string;
    youtubeUrl?: string;
    tiktokUrl?: string;
    whatsappUrl?: string;
    telegramUrl?: string;
    snapchatUrl?: string;
    twitterUrl?: string;
    linkedinUrl?: string;
  };
};

/** How many of a locale's text fields are filled — drives the ✓ / ✗ tab status. */
/**
 * Produces the canonical footer payload used by every CMS save path. Empty
 * social rows are discarded and older flat English fields are migrated into
 * the localized shape so the same copy cannot exist in two places.
 */
export function normalizeFooterForSave(footer: CmsFooter): CmsFooter {
  const social = footer.social
    ? Object.fromEntries(
        Object.entries(footer.social).filter(([, url]) => url?.trim())
      )
    : undefined;
  const next: CmsFooter = { ...footer, ...(social ? { social } : {}) };
  const en = { ...(footer.text?.en ?? {}) };
  let migrated = false;

  for (const field of FOOTER_TEXT_FIELDS) {
    const legacy = footer[field]?.trim();
    if (!legacy) continue;
    if (!en[field]?.trim()) en[field] = legacy;
    delete next[field];
    migrated = true;
  }

  return migrated ? { ...next, text: { ...footer.text, en } } : next;
}

export function footerTranslationStatus(
  footer: CmsFooter | undefined,
  locale: CmsLocale
): { filled: number; total: number; complete: boolean; empty: boolean } {
  const text = footer?.text?.[locale] ?? {};
  const filled = FOOTER_TEXT_FIELDS.filter((field) => text[field]?.trim()).length;
  const total = FOOTER_TEXT_FIELDS.length;

  return { filled, total, complete: filled === total, empty: filled === 0 };
}

export type PageContent = {
  id: string;
  pageKey: string;
  title: string;
  content: HomepageCmsContent;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpdatePageContentPayload = {
  title: string;
  content: HomepageCmsContent;
  published: boolean;
};
