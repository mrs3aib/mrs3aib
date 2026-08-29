import { FadeUp } from "./Reveal";

export default function SectionHeading({
  label,
  title,
  subtitle,
  align = "start"
}: {
  label: string;
  title: string;
  subtitle?: string;
  align?: "start" | "center";
}) {
  return (
    <div
      className={`mb-14 max-w-3xl md:mb-20 ${
        align === "center" ? "mx-auto text-center" : "text-start"
      }`}
    >
      <FadeUp>
        <p className="tracking-nav mb-5 text-xs font-medium uppercase text-accent">
          {label}
        </p>
      </FadeUp>
      <FadeUp delay={0.1}>
        <h2 className="tracking-title font-display text-4xl font-semibold leading-tight text-primary md:text-6xl">
          {title}
        </h2>
      </FadeUp>
      {subtitle ? (
        <FadeUp delay={0.2}>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-secondary md:text-lg">
            {subtitle}
          </p>
        </FadeUp>
      ) : null}
    </div>
  );
}
