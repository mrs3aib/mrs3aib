import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { clients } from "@/lib/data";
import type { HomepageCmsContent } from "@/lib/cms";
import { FadeUp } from "./Reveal";

export default async function Clients({
  content
}: {
  content?: HomepageCmsContent["clients"];
}) {
  const t = await getTranslations("clients");
  /**
   * An entry needs both a name and a logo to render, so half-filled rows —
   * which the CMS allows while an admin is still typing — are dropped rather
   * than shown as a broken image or an unlabelled gap.
   */
  const customLogos =
    content?.items?.flatMap(({ name, logoUrl }) => {
      const trimmedName = name?.trim();
      const trimmedLogo = logoUrl?.trim();
      if (!trimmedName || !trimmedLogo) return [];
      return [{ name: trimmedName, logo: trimmedLogo }];
    }) ?? [];
  const companyLogos = customLogos.length ? customLogos : clients;

  /**
   * CMS logos bypass the image optimizer.
   *
   * Logos are very often SVG — every built-in one is — and the optimizer
   * refuses remote SVGs unless `dangerouslyAllowSVG` is set, which would let
   * any remote SVG on the site run script through it. An uploaded logo would
   * otherwise just fail to appear. These are a few KB and rendered at a fixed
   * height, so there is nothing for the optimizer to save.
   */
  const usingCmsLogos = customLogos.length > 0;

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <FadeUp>
          <p className="tracking-nav mb-12 text-center text-xs font-medium uppercase text-secondary">
            {t("label")}
          </p>
        </FadeUp>
      </div>

      <FadeUp>
        <div className="marquee-viewport overflow-hidden">
          <div className="marquee-track flex w-max items-center gap-16 md:gap-24">
            {[...companyLogos, ...companyLogos].map((client, i) => (
              <Image
                key={`${client.name}-${i}`}
                src={client.logo}
                alt={client.name}
                width={170}
                height={32}
                unoptimized={usingCmsLogos}
                aria-hidden={i >= companyLogos.length}
                className="h-9 w-auto shrink-0 cursor-default opacity-100 grayscale-0 transition-all duration-500 hover:opacity-100 hover:grayscale-0 md:h-11 md:opacity-50 md:grayscale"
              />
            ))}
          </div>
        </div>
      </FadeUp>
    </section>
  );
}
