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
 * lib/data.ts and the `SessionCategory` enum in the Prisma schema.
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
     * when non-empty: each id is resolved against the backend, so a session's
     * cover and title stay current without re-saving the page.
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

/** A value authored once per language. */
export type Localized<T> = Partial<Record<CmsLocale, T>>;

/**
 * Which fields of each section hold reader-facing text.
 *
 * Everything absent here is shared across languages — media URLs, links, and
 * the repeater arrays (gallery items, story chapters, process steps,
 * testimonials), whose per-entry text is not split by locale.
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

/** A section object carrying optional per-locale overrides. */
type MaybeLocalized = Record<string, unknown> & {
  text?: Localized<Record<string, string | undefined>>;
};

/**
 * Resolve one section for a locale: that locale's translation wins, falling
 * back to the flat field so an untranslated record keeps rendering.
 *
 * Shared keys (media, URLs, arrays) pass through untouched.
 */
export function sectionTextFor<T extends object | undefined>(
  section: T,
  sectionKey: TranslatableSection,
  locale: string
): T {
  if (!section) return section;

  const source = section as MaybeLocalized;
  const translated = source.text?.[locale as CmsLocale] ?? {};
  // English is the authoring language, so it stands in for anything this locale
  // has not translated yet. Without it a half-translated section would render
  // with missing paragraphs once migration removed the flat fields.
  const fallback = source.text?.en ?? {};
  const merged: Record<string, unknown> = { ...source };
  delete merged.text;

  for (const field of TRANSLATABLE_FIELDS[sectionKey]) {
    const value = translated[field]?.trim() || fallback[field]?.trim();
    if (value) merged[field] = value;
  }

  return merged as T;
}

/** Resolve every translatable section of a page for one locale. */
export function localizeContent(
  content: HomepageCmsContent | undefined,
  locale: string
): HomepageCmsContent | undefined {
  if (!content) return content;

  const next: Record<string, unknown> = { ...content };
  for (const key of Object.keys(TRANSLATABLE_FIELDS) as TranslatableSection[]) {
    if (next[key]) next[key] = sectionTextFor(next[key] as object, key, locale);
  }

  return next as HomepageCmsContent;
}

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

/**
 * Footer text for one locale, preferring that locale's translation, then the
 * legacy flat fields, so an untranslated record still renders its old content.
 */
export function footerTextFor(
  footer: CmsFooter | undefined,
  locale: string
): CmsFooterText {
  if (!footer) return {};

  const translated = footer.text?.[locale as CmsLocale] ?? {};
  // English backs any field this locale has not translated yet — see the note
  // in `sectionTextFor`.
  const fallback = footer.text?.en ?? {};
  const merged: CmsFooterText = { ...footer };
  delete (merged as { text?: unknown }).text;

  for (const field of FOOTER_TEXT_FIELDS) {
    const value = translated[field]?.trim() || fallback[field]?.trim();
    if (value) merged[field] = value;
  }

  return merged;
}

/** How many of a locale's text fields are filled — drives the ✓ / ✗ tab status. */
export function footerTranslationStatus(
  footer: CmsFooter | undefined,
  locale: CmsLocale
): { filled: number; total: number; complete: boolean; empty: boolean } {
  const text = footer?.text?.[locale] ?? {};
  const filled = FOOTER_TEXT_FIELDS.filter((field) => text[field]?.trim()).length;
  const total = FOOTER_TEXT_FIELDS.length;

  return { filled, total, complete: filled === total, empty: filled === 0 };
}

export type PageContentPayload = {
  pageKey: string;
  title: string;
  content: HomepageCmsContent;
  published: boolean;
  updatedAt: string;
};
