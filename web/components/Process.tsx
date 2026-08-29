import { getTranslations } from "next-intl/server";
import { processSteps } from "@/lib/data";
import SectionHeading from "./SectionHeading";
import TimelineSpine from "./TimelineSpine";
import { FadeUp } from "./Reveal";
import type { HomepageCmsContent } from "@/lib/cms";

export default async function Process({
  content
}: {
  content?: HomepageCmsContent["process"];
}) {
  const t = await getTranslations("process");
  const steps = content?.steps?.length
    ? content.steps
    : processSteps.map((step) => ({
        number: t(`steps.${step}.number`),
        title: t(`steps.${step}.title`),
        text: t(`steps.${step}.text`)
      }));

  return (
    <section className="mx-auto max-w-7xl px-6 py-28 md:px-10 md:py-40">
      <div className="grid gap-16 md:grid-cols-12">
        <div className="md:col-span-4">
          <SectionHeading
            label={content?.label || t("label")}
            title={content?.title || t("title")}
          />
        </div>

        <div className="relative md:col-span-7 md:col-start-6">
          <TimelineSpine />

          <ol className="flex flex-col gap-14">
            {steps.map((step, i) => (
              <FadeUp key={`${step.title}-${i}`} delay={i * 0.1}>
                <li className="relative ps-12">
                  <span className="absolute start-0 top-2 h-[15px] w-[15px] rounded-full border border-accent/60 bg-base">
                    <span className="absolute inset-[4px] rounded-full bg-accent" />
                  </span>
                  <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                    <span className="font-display text-sm font-medium text-accent">
                      {step.number}
                    </span>
                    <h3 className="tracking-title font-display text-2xl font-semibold text-primary md:text-3xl">
                      {step.title}
                    </h3>
                  </div>
                  <p className="mt-3 max-w-md leading-relaxed text-secondary">
                    {step.text}
                  </p>
                </li>
              </FadeUp>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
