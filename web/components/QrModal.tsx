"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { CloseIcon, QrIcon } from "./icons";

/**
 * Share-by-QR dialog.
 *
 * The code is rendered at 640px and displayed at half that, so it stays sharp
 * on high-density screens and is still scannable from a phone held at arm's
 * length. A generous quiet zone (`margin`) and high error correction (`ecc=H`)
 * are what let a camera lock on quickly, which is the whole point of the panel.
 */
export default function QrModal({
  open,
  albumUrl,
  title,
  onClose
}: {
  open: boolean;
  albumUrl: string;
  title: string;
  onClose: () => void;
}) {
  const t = useTranslations("albums");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // A stale "Copied" badge on reopen would be misleading.
  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const qrSrc = albumUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=640x640&margin=16&ecc=H&data=${encodeURIComponent(albumUrl)}`
    : "";

  const copyUrl = async () => {
    if (!albumUrl) return;
    try {
      await navigator.clipboard.writeText(albumUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          data-lenis-prevent
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#14161a] p-7 text-center shadow-2xl shadow-black/60"
          >
            <button
              type="button"
              aria-label={t("close")}
              onClick={onClose}
              className="absolute end-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/10 hover:text-white"
            >
              <CloseIcon className="h-4 w-4" />
            </button>

            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent">
              <QrIcon className="h-5 w-5" />
            </span>

            <h2 className="font-display mt-4 text-lg font-semibold text-white">
              {t("qrTitle")}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-white/55">
              {t("qrHint")}
            </p>

            {/* White plate behind the code: scanners need the light quiet zone,
                and the surrounding panel is dark. */}
            <div className="mx-auto mt-6 w-fit rounded-xl bg-white p-3 shadow-lg shadow-black/30">
              {qrSrc ? (
                <img
                  src={qrSrc}
                  alt={`${title} QR`}
                  width={320}
                  height={320}
                  className="h-52 w-52"
                />
              ) : (
                <span className="flex h-52 w-52 animate-pulse rounded bg-black/10" />
              )}
            </div>

            <p className="mt-5 truncate text-xs text-white/40" title={albumUrl}>
              {albumUrl}
            </p>

            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={copyUrl}
                className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
              >
                {copied ? t("copied") : t("copyLink")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
