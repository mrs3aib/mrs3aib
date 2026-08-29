import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { featuredProjects } from "@/lib/data";
import SectionHeading from "./SectionHeading";
import { FadeUp, MaskReveal } from "./Reveal";
import ViewProjectLink from "./ViewProjectLink";

export default async function FeaturedProjects() {
  const t = await getTranslations("projects");

  return (
    <section id="projects" className="mx-auto max-w-7xl px-6 py-28 md:px-10 md:py-40">
      <SectionHeading
        label={t("label")}
        title={t("title")}
        subtitle={t("subtitle")}
      />

      <div className="flex flex-col gap-24 md:gap-36">
        {featuredProjects.map((project, index) => {
          const reversed = index % 2 === 1;
          return (
            <article
              key={project.id}
              className="grid items-center gap-10 md:grid-cols-12"
            >
              <MaskReveal
                className={`group relative overflow-hidden rounded-sm md:col-span-7 ${
                  reversed ? "md:order-2 md:col-start-6" : ""
                }`}
              >
                <div className="relative aspect-[16/11] overflow-hidden">
                  <Image
                    src={project.image}
                    alt={t(`items.${project.id}.title`)}
                    fill
                    sizes="(max-width: 768px) 100vw, 58vw"
                    className="object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-105 group-active:scale-105 group-focus-within:scale-105"
                  />
                  <div className="absolute inset-0 bg-base/10 transition-opacity duration-700 group-hover:opacity-0 group-active:opacity-0 group-focus-within:opacity-0" />
                </div>
              </MaskReveal>

              <div
                className={`md:col-span-4 ${
                  reversed ? "md:order-1 md:col-start-1" : "md:col-start-9"
                }`}
              >
                <FadeUp>
                  <p className="tracking-nav mb-4 text-xs font-medium uppercase text-accent">
                    {t(`items.${project.id}.category`)}
                  </p>
                </FadeUp>
                <FadeUp delay={0.1}>
                  <h3 className="tracking-title font-display text-3xl font-semibold leading-snug text-primary md:text-4xl">
                    {t(`items.${project.id}.title`)}
                  </h3>
                </FadeUp>
                <FadeUp delay={0.2}>
                  <p className="mt-5 leading-relaxed text-secondary">
                    {t(`items.${project.id}.description`)}
                  </p>
                </FadeUp>
                <FadeUp delay={0.3}>
                  <ViewProjectLink label={t("view")} />
                </FadeUp>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
