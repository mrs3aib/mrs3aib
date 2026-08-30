import { useTranslations } from "next-intl";
import Button from "./Button";
import CategoryCarousel from "./CategoryCarousel";
import CategoryLink from "./CategoryLink";
import HeroMedia from "./HeroMedia";
import { HeroFadeIn, HeroTitleReveal } from "./HeroReveal";
import type { CmsHero } from "@/lib/cms";

/**
 * Column counts for the hero's category bar, indexed by how many categories
 * there are. Spelled out in full because Tailwind scans source text — a
 * template-built class like `grid-cols-${n}` is never generated.
 */
const SM_COLUMNS: Record<number, string> = {
  0: "grid-cols-1",
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4"
};

const MD_COLUMNS: Record<number, string> = {
  0: "md:grid-cols-1",
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
  6: "md:grid-cols-6",
  7: "md:grid-cols-7",
  8: "md:grid-cols-8"
};

export default function Hero({
  content,
  categoryItems
}: {
  content?: CmsHero;
  categoryItems: { id: string; label: string }[];
}) {
  const t = useTranslations("hero");
  const categories = categoryItems.map((category) => category.id);
  const categoryLabels = Object.fromEntries(
    categoryItems.map((category) => [category.id, category.label])
  );

  // How many items sit in one row at each breakpoint — used both for the grid
  // track count at each breakpoint.
  const smColumns = Math.min(categoryItems.length, 4) || 1;
  const mdColumns = Math.min(categoryItems.length, 8) || 1;

  const hasCmsMedia = Boolean(content?.mediaUrl);
  const fallbackImage = "/images/placeHolder.png";
  const mediaUrl = hasCmsMedia ? (content?.mediaUrl as string) : fallbackImage;
  const mediaType = hasCmsMedia ? (content?.mediaType ?? "image") : "image";
  const studio = content?.studio || t("studio");
  const wordmark = content?.wordmark || t("wordmark");
  const title = content?.title || t("title");
  const cta = content?.cta || t("cta");
  const ctaSecondary = content?.ctaSecondary || t("ctaSecondary");
  const mediaClassName =
    mediaType === "video"
      ? "absolute inset-0 h-full w-full bg-black object-cover object-center md:object-[32%_30%] lg:object-center"
      : "absolute inset-0 h-full w-full object-cover object-[center_30%] md:object-[32%_30%] lg:object-center";

  return (
    <section className="relative h-[max(32rem,68svh)] overflow-hidden sm:h-svh sm:min-h-180">
      <HeroMedia
        mediaType={mediaType}
        mediaUrl={mediaUrl}
        posterUrl={content?.posterUrl}
        fallbackImage={fallbackImage}
        className={mediaClassName}
      />
      <div className="absolute inset-0 bg-linear-to-b from-base/70 via-base/25 to-base" />
      <div className="absolute inset-0 bg-linear-to-r from-base/35 via-base/10 to-base/45 rtl:bg-linear-to-l" />
      <div className="absolute inset-0 bg-base/15" />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col items-center justify-center px-6 pb-36 pt-20 text-center sm:pb-44 sm:pt-32 md:px-10 md:pb-48 md:pt-36">
        <HeroTitleReveal>
          <h1 className="tracking-hero font-display text-[clamp(2.75rem,7vw,5.75rem)] font-bold leading-[1.05] text-accent">
            {studio}
          </h1>
        </HeroTitleReveal>

        <HeroFadeIn delay={0.55}>
          <p className="mt-4 text-[clamp(0.78rem,1.6vw,1.15rem)] font-medium uppercase text-primary/90 [letter-spacing:0.35em]">
            {wordmark}
          </p>
        </HeroFadeIn>

        <HeroFadeIn delay={0.75}>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-primary/90 md:text-lg">
            {title}
          </p>
        </HeroFadeIn>

        <HeroFadeIn
          delay={0.95}
          className="mt-8 flex flex-wrap items-center justify-center gap-3 md:gap-4"
        >
          <Button href="#gallery">{cta}</Button>
          {/* <Button href="#contact" variant="secondary">
            {ctaSecondary}
          </Button> */}
        </HeroFadeIn>
      </div>

      <HeroFadeIn
        delay={1.15}
        className="absolute inset-x-0 bottom-0 z-10 px-4 pb-5 md:px-10 md:pb-8"
      >
        <CategoryCarousel
          categories={categories}
          labels={categoryLabels}
          className="mx-auto max-w-[calc(100vw-2rem)] rounded border border-line bg-black/60 shadow-2xl shadow-black/20 backdrop-blur-md sm:hidden"
          itemClassName="min-h-24 border-e border-line py-4"
        />
        {/* Column count follows how many categories there actually are, capped
            at the old 4 / 8. A fixed `md:grid-cols-8` left an empty cell behind
            whenever a category was hidden in the CMS. */}
        <div
          className={`mx-auto hidden max-w-6xl rounded border border-line bg-black/60 shadow-2xl shadow-black/20 backdrop-blur-md sm:grid ${SM_COLUMNS[smColumns]} ${MD_COLUMNS[mdColumns]}`}
        >
          {categories.map((id) => (
            <CategoryLink
              key={id}
              id={id}
              label={categoryLabels[id]}
              // Every tile owns its end divider. This also keeps incomplete
              // final rows visually closed when the category count is not an
              // exact multiple of the active column count.
              className="min-h-24 border-e border-line py-4 md:min-h-22 md:py-5"
            />
          ))}
        </div>
      </HeroFadeIn>
    </section>
  );
}
