"use client";

import { motion } from "framer-motion";

export default function TimelineSpine() {
  return (
    <motion.span
      initial={{ scaleY: 0 }}
      whileInView={{ scaleY: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-y-0 start-[7px] w-px origin-top bg-line"
    />
  );
}
