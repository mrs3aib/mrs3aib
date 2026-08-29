import { getTranslations } from "next-intl/server";
import { categories } from "@/lib/data";
import SectionHeading from "./SectionHeading";
import { FadeUp } from "./Reveal";
import CategoryCarousel from "./CategoryCarousel";
import CategoryLink from "./CategoryLink";

export default async function Services() {
  const t = await getTranslations("services");
  const tCategories = await getTranslations("categories");
  const categoryLabels = Object.fromEntries(
    categories.map((id) => [id, tCategories(id)])
  ) as Record<(typeof categories)[number], string>;

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
