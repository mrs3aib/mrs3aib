import { getTranslations } from "next-intl/server";
import { getCmsCategories } from "@/lib/api";
import { categories as fallbackCategories } from "@/lib/data";
import SectionHeading from "./SectionHeading";
import { FadeUp } from "./Reveal";
import CategoryCarousel from "./CategoryCarousel";
import CategoryLink from "./CategoryLink";

export default async function Services() {
  const t = await getTranslations("services");
  const tCategories = await getTranslations("categories");

  /**
   * Only categories the CMS still shows. Reading the hardcoded list here kept a
   * hidden category's tile in this grid, and the link led to a page that 404s.
   * Resolved rather than passed in so the section stays correct wherever it is
   * rendered.
   */
  const categoryItems = await getCmsCategories(fallbackCategories, (id) =>
    tCategories(id)
  );
  const categories = categoryItems.map((category) => category.id);
  const categoryLabels = Object.fromEntries(
    categoryItems.map((category) => [category.id, category.label])
  ) as Record<string, string>;

  return (
    <section id="services" className="border-y border-line bg-card/40 py-28 md:py-40">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <SectionHeading
          label={t("label")}
          title={t("title")}
          subtitle={t("subtitle")}
        />

        <FadeUp>
          <CategoryCarousel
            categories={categories}
            labels={categoryLabels}
            className="rounded border border-line bg-card/90 backdrop-blur-md sm:hidden"
            itemClassName="border-e border-line py-5"
          />
          <div className="hidden grid-cols-4 divide-x divide-line rounded-sm border border-line bg-card/90 backdrop-blur-md rtl:divide-x-reverse sm:grid md:grid-cols-8">
            {categories.map((id) => (
              <CategoryLink
                key={id}
                id={id}
                label={categoryLabels[id]}
                className="py-5 sm:py-6 md:py-8"
              />
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
