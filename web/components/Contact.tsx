import { getTranslations } from "next-intl/server";
import { FadeUp } from "./Reveal";
import Button from "./Button";
import { ArrowUpRight } from "./icons";
import type { HomepageCmsContent } from "@/lib/cms";
import { BOOKING_WHATSAPP_URL } from "@/lib/data";

export default async function Contact({
  content
}: {
  content?: HomepageCmsContent["contact"];
}) {
  const t = await getTranslations("contact");
  const email = content?.email || t("email");

  const channels = [
    {
      key: "email",
      label: t("emailLabel"),
      value: email,
      href: `mailto:${email}`
    },
    {
      key: "instagram",
      label: t("instagramLabel"),
      value: content?.instagram || t("instagram"),
      href: content?.instagramUrl || "https://instagram.com"
    },
    {
      key: "whatsapp",
      label: t("whatsappLabel"),
      value: content?.whatsapp || t("whatsapp"),
      href: content?.whatsappUrl || "https://wa.me/201000000000"
    }
  ];

  return (
    <section
      id="contact"
      className="border-t border-line bg-card/40 py-28 md:py-44"
    >
      <div className="mx-auto grid max-w-7xl gap-16 px-6 md:grid-cols-12 md:px-10">
        <div className="md:col-span-7">
          <FadeUp>
            <p className="tracking-nav mb-6 text-xs font-medium uppercase text-accent">
              {content?.label || t("label")}
            </p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2 className="tracking-hero font-display max-w-2xl text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.1] text-primary">
              {content?.title || t("title")}
            </h2>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mt-6 max-w-md text-secondary">
              {content?.subtitle || t("subtitle")}
            </p>
          </FadeUp>
          <FadeUp delay={0.3}>
            <div className="mt-12">
              {/* Button already opens external hrefs in a new tab. */}
              <Button href={BOOKING_WHATSAPP_URL}>
                {content?.book || t("book")}
              </Button>
            </div>
          </FadeUp>
        </div>

        <div className="flex flex-col justify-center gap-2 md:col-span-4 md:col-start-9">
          {channels.map((channel, i) => (
            <FadeUp key={channel.key} delay={0.15 + i * 0.1}>
              <a
                href={channel.href}
                target={channel.key === "email" ? undefined : "_blank"}
                rel="noreferrer"
                className="group flex items-center justify-between border-b border-line py-6 transition-colors duration-500 hover:border-accent/50 active:border-accent/50 focus-visible:border-accent/50 focus-visible:outline-none"
              >
                <div>
                  <p className="tracking-nav text-[10px] uppercase text-secondary">
                    {channel.label}
                  </p>
                  <p className="mt-1.5 font-medium text-primary transition-colors duration-300 group-hover:text-accent group-active:text-accent group-focus-visible:text-accent">
                    {channel.value}
                  </p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-secondary transition-all duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-accent group-active:-translate-y-1 group-active:translate-x-1 group-active:text-accent group-focus-visible:-translate-y-1 group-focus-visible:translate-x-1 group-focus-visible:text-accent rtl:group-hover:-translate-x-1 rtl:group-active:-translate-x-1 rtl:group-focus-visible:-translate-x-1" />
              </a>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
