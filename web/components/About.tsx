import { getTranslations } from "next-intl/server";
import Button from "./Button";
import ResilientImage from "./ResilientImage";
import { FadeUp } from "./Reveal";
import type { HomepageCmsContent } from "@/lib/cms";
import { BOOKING_WHATSAPP_URL } from "@/lib/data";

export default async function About({
  content
}: {
  content?: HomepageCmsContent["about"];
}) {
  const t = await getTranslations("about");
  const label = content?.label || t("label");
  const title = content?.title || t("title");
  const body = content?.body || t("body");
  const cta = content?.cta || t("cta");
  const localImage = "/images/about-photographer.png";
  const imageUrl = content?.imageUrl || localImage;
  /**
   * A CMS image is a signed storage URL that expires. Routing one through the
   * Next optimizer caches a derivative against a URL that will stop working,
   * and the optimizer answers a lapsed source with an error rather than the
   * original — which is how this section ended up showing a broken-image icon
   * and its alt text. The bundled default is a local asset and optimizes fine.
   */
  const isRemoteImage = !imageUrl.startsWith("/");

  return (
    <section id="about" className="bg-[#120f0b] px-6 py-16 md:px-10 md:py-20">
      <FadeUp>
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-md border border-line bg-black/45 shadow-2xl shadow-black/30 md:grid-cols-12">
          <div className="flex flex-col justify-center px-6 py-8 md:col-span-7 md:px-10">
            <p className="mb-3 font-display text-xl font-semibold text-accent">
              {label}
            </p>
            <p className="max-w-2xl text-sm leading-7 text-secondary">
              {body}
            </p>
            <div className="mt-7">
              <Button href={BOOKING_WHATSAPP_URL} variant="secondary" className="px-7 py-2.5">
                {cta}
              </Button>
            </div>
          </div>

          <div className="relative min-h-72 overflow-hidden md:col-span-5 md:min-h-64">
            <ResilientImage
              src={imageUrl}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, 34vw"
              className="object-cover object-center grayscale md:object-left"
              unoptimized={isRemoteImage}
              // One frame on the page, so the sweep is affordable and says the
              // picture is coming rather than leaving a flat panel.
              shimmer
            />
            <div className="absolute inset-0 bg-linear-to-l from-transparent via-black/10 to-black/75 rtl:bg-linear-to-r" />
          </div>
        </div>
      </FadeUp>
    </section>
  );
}
