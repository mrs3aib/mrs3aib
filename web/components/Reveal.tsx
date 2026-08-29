"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

const luxe = [0.22, 1, 0.36, 1] as const;

export function FadeUp({
  children,
  delay = 0,
  className
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, delay, ease: luxe }}
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({
  children,
  delay = 0,
  className
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 1.1, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Image mask reveal: the mask opens upward while the content settles
 * from a slight zoom — direction-agnostic so it works in RTL untouched.
 */
export function MaskReveal({
  children,
  delay = 0,
  className
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden ${className ?? ""}`}>
      <motion.div
        className="h-full w-full"
        initial={{ clipPath: "inset(100% 0% 0% 0%)", scale: 1.12 }}
        whileInView={{ clipPath: "inset(0% 0% 0% 0%)", scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 1.3, delay, ease: luxe }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/** Text slides up from behind an invisible line, like print settling on a page. */
export function LineReveal({
  children,
  delay = 0,
  className
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <span className={`block overflow-hidden ${className ?? ""}`}>
      <motion.span
        className="block"
        initial={{ y: "110%" }}
        whileInView={{ y: "0%" }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 1, delay, ease: luxe }}
      >
        {children}
      </motion.span>
    </span>
  );
}
