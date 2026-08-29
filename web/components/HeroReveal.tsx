"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

const luxe = [0.22, 1, 0.36, 1] as const;

export function HeroTitleReveal({ children }: { children: ReactNode }) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        initial={{ y: "105%" }}
        animate={{ y: "0%" }}
        transition={{ delay: 0.35, duration: 1.1, ease: luxe }}
        className="block"
      >
        {children}
      </motion.span>
    </span>
  );
}

export function HeroFadeIn({
  children,
  delay = 0.65,
  className
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.9, ease: luxe }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
