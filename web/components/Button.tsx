"use client";

import type { ReactNode, MouseEventHandler } from "react";
import { ArrowRight } from "./icons";
import { scrollToId } from "@/lib/scroll";

export default function Button({
  children,
  href,
  onClick,
  variant = "primary",
  withArrow = false,
  className
}: {
  children: ReactNode;
  href?: string;
  onClick?: MouseEventHandler;
  variant?: "primary" | "secondary";
  withArrow?: boolean;
  className?: string;
}) {
  const variants = {
    // Gold gradient fill, dark label
    primary:
      "btn-gold-border bg-[linear-gradient(to_right,#554023_0%,#c99846_100%)] text-white hover:bg-none hover:bg-transparent hover:text-accent active:bg-none active:bg-transparent active:text-accent",
    // Dark pill with a light hairline border
    secondary:
      "border border-white/25 bg-transparent text-primary hover:border-white hover:bg-white hover:text-black active:border-white active:bg-white active:text-black"
  };

  const base =
    "group inline-flex items-center justify-center gap-3 rounded-md px-9 py-3.5 text-sm font-medium transition-bg duration-200 " +
    variants[variant] +
    " " +
    (className ?? "");

  const content = (
    <>
      <span>{children}</span>
      {withArrow ? (
        <ArrowRight className="h-4 w-4 bg-linear-to-bl transition-transform duration-500 group-hover:translate-x-1 group-active:translate-x-1 rtl:group-hover:-translate-x-1 rtl:group-active:-translate-x-1" />
      ) : null}
    </>
  );

  if (href?.startsWith("#")) {
    return (
      <a
        href={href}
        className={base}
        onClick={(e) => {
          e.preventDefault();
          scrollToId(href);
        }}
      >
        {content}
      </a>
    );
  }

  if (href) {
    return (
      <a href={href} className={base} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={base}>
      {content}
    </button>
  );
}
