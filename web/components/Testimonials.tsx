"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { testimonialIds } from "@/lib/data";
import type { HomepageCmsContent } from "@/lib/cms";
import SectionHeading from "./SectionHeading";

const ROTATE_MS = 7000;

export default function Testimonials({
  content
}: {
  content?: HomepageCmsContent["testimonials"];
}) {
  const t = useTranslations("testimonials");
  const [index, setIndex] = useState(0);
  const items = content?.items?.length
    ? content.items.map((item) => ({
        quote: item.quote || "",
        name: item.name || "",
        role: item.role || ""
      }))
    : testimonialIds.map((id) => ({
        quote: t(`items.${id}.quote`),
        name: t(`items.${id}.name`),
        role: t(`items.${id}.role`)
      }));

  useEffect(() => {
    const id = setInterval(
      () => setIndex((i) => (i + 1) % items.length),
      ROTATE_MS
    );
    return () => clearInterval(id);
  }, [items.length]);

  const current = items[index] ?? items[0];

  return (
    <section className="border-y border-line bg-card/40 py-28 md:py-40">
      <div className="mx-auto max-w-5xl px-6 md:px-10">
        <SectionHeading
          label={content?.label || t("label")}
          title={content?.title || t("title")}
          align="center"
        />

        <div className="relative min-h-64 md:min-h-56">
          <AnimatePresence mode="wait" initial={false}>
            <motion.figure
              key={`${current.name}-${index}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="text-center"
            >
              <blockquote className="tracking-title font-display mx-auto max-w-3xl text-2xl font-medium leading-relaxed text-primary md:text-3xl">
                "{current.quote}"
              </blockquote>
              <figcaption className="mt-8">
                <p className="text-sm font-medium text-primary">{current.name}</p>
                <p className="mt-1 text-xs uppercase tracking-nav text-secondary">
                  {current.role}
                </p>
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>

        <div className="mt-10 flex justify-center gap-3">
          {items.map((item, i) => (
            <button
              key={`${item.name}-${i}`}
              type="button"
              aria-label={item.name}
              onClick={() => setIndex(i)}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === index
                  ? "w-10 bg-accent"
                  : "w-4 bg-white/15 hover:bg-white/30 active:bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
