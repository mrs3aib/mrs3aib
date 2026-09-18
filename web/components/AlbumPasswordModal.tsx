"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "@/i18n/navigation";
import { unlockAlbum } from "@/lib/api";
import type { CategoryId } from "@/lib/data";
import { startScroll, stopScroll } from "@/lib/scroll";
import { CloseIcon } from "./icons";

/**
 * Password prompt for a locked album, asked where the visitor clicked.
 *
 * Sending someone to the album page only to refuse them there costs a page
 * load to deliver a rejection. The listing already knows which albums are
 * gated, so the prompt happens in place and navigation follows a correct
 * password rather than preceding it.
 *
 * The password is verified here, then handed to the album page through
 * `sessionStorage` so the gate there does not ask a second time. That key is
 * read once and removed; nothing is persisted beyond the tab, matching
 * `AlbumPasswordGate`'s own rule that a reload asks again.
 */

/** Where a verified password waits for the album page to pick it up. */
export const UNLOCK_HANDOFF_KEY = "album-unlock";

export type UnlockHandoff = { albumId: string; password: string };

export default function AlbumPasswordModal({
  category,
  albumId,
  title,
  categoryLabel,
  onClose
}: {
  category: CategoryId;
  albumId: string;
  title: string;
  categoryLabel: string;
  onClose: () => void;
}) {
  const t = useTranslations("albumPassword");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<"wrong" | "error" | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    stopScroll();
    inputRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      startScroll();
    };
  }, [onClose]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password.trim() || pending) return;

    setPending(true);
    setError(null);
    // Verified here so a wrong password is answered in the modal rather than
    // after a page load.
    // One item: this call only decides whether the password is right, and the
    // album it returns is discarded in favour of the page navigated to below.
    // Asking for the whole gallery here signed two URLs per item for a payload
    // nothing reads.
    const result = await unlockAlbum(category, albumId, password, 1);

    if (result.ok) {
      try {
        sessionStorage.setItem(
          UNLOCK_HANDOFF_KEY,
          JSON.stringify({ albumId, password } satisfies UnlockHandoff)
        );
      } catch {
        // Private mode or blocked storage: the album page simply asks again,
        // which is the old behaviour rather than a failure.
      }
      router.push(`/category/${category}/${albumId}`);
      /*
       * Dismissed rather than left standing.
       *
       * `router.push` is a client-side navigation, so nothing here is torn down
       * on its own, and the success path used to return with `pending` still
       * true and the dialog still mounted. Coming back to the listing then
       * restored it exactly as it was: the button read "checking", and the
       * guard at the top of this function returned early on every attempt, so
       * the password could never be submitted again.
       *
       * Closing also unmounts this component, which releases the scroll lock
       * its effect took — without that, the album the visitor had just opened
       * could not be scrolled.
       */
      onClose();
      return;
    }

    setPending(false);
    setError(result.reason);
    // Clear only a rejected password; a network failure is worth retrying with
    // the same input rather than making the visitor type it again.
    if (result.reason === "wrong") {
      setPassword("");
      inputRef.current?.focus();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 px-6 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="album-password-title"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-md rounded border border-accent/45 bg-[rgba(10,10,10,0.92)] p-6 shadow-2xl shadow-black/50 md:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />

          <button
            type="button"
            aria-label={t("close")}
            onClick={onClose}
            className="absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded border border-white/15 text-secondary transition-colors hover:border-white hover:text-primary"
          >
            <CloseIcon />
          </button>

          <p className="tracking-nav text-[10px] uppercase text-accent">
            {categoryLabel}
          </p>
          <h2
            id="album-password-title"
            className="font-display mt-2 pe-10 text-2xl font-semibold text-primary"
          >
            {title}
          </h2>
          <p className="mt-3 text-sm text-secondary">{t("intro")}</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
            <label htmlFor="album-password-modal" className="sr-only">
              {t("label")}
            </label>
            <input
              ref={inputRef}
              id="album-password-modal"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              placeholder={t("label")}
              aria-invalid={error === "wrong"}
              aria-describedby={error ? "album-password-modal-error" : undefined}
              className="w-full rounded border border-white/15 bg-black/40 px-4 py-3 text-sm text-primary outline-none transition-colors placeholder:text-secondary/60 focus:border-accent"
            />

            {error ? (
              <p
                id="album-password-modal-error"
                role="alert"
                className="text-xs text-red-400"
              >
                {error === "wrong" ? t("wrong") : t("error")}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending || !password.trim()}
              className="mt-1 rounded bg-accent px-6 py-3 text-sm font-medium text-black transition-opacity disabled:opacity-50"
            >
              {pending ? t("checking") : t("submit")}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
