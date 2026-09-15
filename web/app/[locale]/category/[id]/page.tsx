import { getPageContentForRender } from "@/lib/cmsPreview";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { categories, type CategoryId } from "@/lib/data";
import {
  getCmsCategories,
  resolveCategoryAlbums
} from "@/lib/api";
import { sectionTextFor } from "@/lib/cms";
import CategoryDetail from "@/components/CategoryDetail";

function isKnownCategory(id: string) {
  return (categories as readonly string[]).includes(id);
}

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    categories.map((id) => ({ locale, id }))
  );
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const categoryPage = await getPageContentForRender(`category-${id}`);

  /**
   * A hidden category is a 404, so it must not lend the page its title.
   * `generateMetadata` runs before the component's own `notFound()`, so without
   * this the not-found page was served wearing the hidden category's title and
   * description — which is how a hidden category still looked present.
   */
  if (categoryPage?.content.pageHidden) return {};

  // Resolve the locale first, or an Arabic page gets English metadata.
  const hero = sectionTextFor(categoryPage?.content.hero, "hero", locale);
  if (hero?.title) {
    return {
      title: hero.title,
      description: hero.subtitle
    };
  }
  if (!isKnownCategory(id)) return {};
  const t = await getTranslations({ locale, namespace: "categoryPages" });
  return {
    title: t(`items.${id}.title`),
    description: t(`items.${id}.subtitle`)
  };
}

export default async function CategoryPage({
  params
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const tCategories = await getTranslations({ locale, namespace: "categories" });
  const categoryItems = await getCmsCategories(categories, (categoryId) =>
    tCategories(categoryId)
  );
  const cmsCategory = categoryItems.find((category) => category.id === id);

  if (!isKnownCategory(id) && !cmsCategory) {
    notFound();
  }

  const pageContent = await getPageContentForRender(`category-${id}`);

  // Hidden in the CMS: behave as if the category does not exist. `categoryItems`
  // already excludes it, so the only way in is a direct URL.
  if (pageContent?.content.pageHidden) {
    notFound();
  }
  // Published sessions when the backend has any, placeholder albums otherwise.
  const albums = isKnownCategory(id)
    ? await resolveCategoryAlbums(id as CategoryId)
    : [];

  return (
    <CategoryDetail
      id={id}
      content={sectionTextFor(pageContent?.content.hero, "hero", locale)}
      categoryItems={categoryItems}
      categoryLabel={cmsCategory?.label}
      albums={albums}
    />
  );
}
