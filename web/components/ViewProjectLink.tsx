"use client";

import { scrollToId } from "@/lib/scroll";
import { ArrowRight } from "./icons";

export default function ViewProjectLink({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => scrollToId("#gallery")}
      className="group/link mt-8 inline-flex items-center gap-3 text-sm font-medium text-primary transition-colors duration-300 hover:text-accent active:text-accent focus-visible:text-accent focus-visible:outline-none"
    >
      <span className="border-b border-white/20 pb-1 transition-colors duration-300 group-hover/link:border-accent group-active/link:border-accent group-focus-visible/link:border-accent">
        {label}
      </span>
      <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover/link:translate-x-1 group-active/link:translate-x-1 group-focus-visible/link:translate-x-1 rtl:group-hover/link:-translate-x-1 rtl:group-active/link:-translate-x-1 rtl:group-focus-visible/link:-translate-x-1" />
    </button>
  );
}
