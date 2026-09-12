"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { unlockAlbum, type ResolvedAlbum } from "@/lib/api";
import type { CategoryId } from "@/lib/data";
import AlbumView from "./AlbumView";
import { UNLOCK_HANDOFF_KEY, type UnlockHandoff } from "./AlbumPasswordModal";

/**
 * Password wall for a `protected` album.
 *
 * The server sends only the album's title for a gated album, never its media,
 * so there is nothing here to reveal before the password is accepted — the
 * contents arrive from `/unlock` and are held in state for this view only.
 *
 * Nothing is persisted: a reload asks again. Remembering the unlock would mean
 * storing a credential in the browser, which is a larger decision than a
 * password prompt should make on its own.
 */
export default function AlbumPasswordGate({
  category,
  albumId,
  title,
  categoryLabel,
  backHref
}: {
  category: CategoryId;
  albumId: string;
  title: string;
  categoryLabel: string;
  backHref: string;
}) {
  const t = useTranslations("albumPassword");
  const [password, setPassword] = useState("");
  const [album, setAlbum] = useState<ResolvedAlbum | null>(null);
  const [error, setError] = useState<"wrong" | "error" | null>(null);
  const [pending, setPending] = useState(false);
  /**
   * True until the handoff below has been checked, so the form is not shown for
   * a frame to someone who already passed the modal on the listing page.
   */
  const [checkingHandoff, setCheckingHandoff] = useState(true);

  /**
   * Accept a password already verified by the listing's modal.
   *
   * Read once and removed immediately: the value is a credential, and leaving
   * it in storage would unlock this album on a later visit without asking —
   * exactly what this component's "a reload asks again" rule rules out.
   */
  useEffect(() => {
    let handoff: UnlockHandoff | null = null;
    try {
      const raw = sessionStorage.getItem(UNLOCK_HANDOFF_KEY);
      sessionStorage.removeItem(UNLOCK_HANDOFF_KEY);
      if (raw) handoff = JSON.parse(raw) as UnlockHandoff;
    } catch {
      // Blocked storage or malformed value: fall through to asking normally.
    }

    if (handoff?.albumId !== albumId || !handoff.password) {
      setCheckingHandoff(false);
      return;
    }

    let cancelled = false;
    void unlockAlbum(category, albumId, handoff.password).then((result) => {
      if (cancelled) return;
      // A failure here just shows the form; the visitor types it again.
      if (result.ok) setAlbum(result.album);
      setCheckingHandoff(false);
    });

    return () => {
      cancelled = true;
    };
  }, [albumId, category]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password.trim() || pending) return;

    setPending(true);
    setError(null);
    const result = await unlockAlbum(category, albumId, password);
    setPending(false);

    if (result.ok) {
      setAlbum(result.album);
      return;
    }
    setError(result.reason);
    // Clear only a rejected password; a network failure is worth retrying with
    // the same input rather than making the visitor type it again.
    if (result.reason === "wrong") setPassword("");
  };

  /**
   * Nothing is rendered while the handoff is being redeemed: showing the
   * password form first would flash a prompt at someone who just answered it.
   */
  if (checkingHandoff) return null;

  if (album) {
    return (
      <AlbumView
        album={album}
        categoryLabel={categoryLabel}
        variant="page"
        backHref={backHref}
      />
    );
  }

  return (
    <section className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-black px-6 py-28">
      {/*
        `absolute` rather than `fixed` here: the section is `isolate`, which
        creates a stacking context a fixed child would be trapped in anyway.
        `min-h-svh` keeps the box viewport-height, so the backdrop covers the
        same area it would if pinned — without the runaway stretch a tall page
        would cause.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[url('/images/album-photography-bg.png')] bg-cover bg-center bg-no-repeat"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black/40" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mx-auto max-h-[calc(100svh-3rem)] w-full max-w-md overflow-y-auto rounded border border-accent/45 bg-[rgba(10,10,10,0.8)] p-6 shadow-2xl shadow-black/50 backdrop-blur-sm md:max-h-[calc(100svh-5rem)] md:p-8"
      >
        <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />

        <p className="tracking-nav text-[10px] uppercase text-accent">
          {categoryLabel}
        </p>
        <h1 className="font-display mt-2 text-2xl font-semibold text-primary">
          {title}
        </h1>
        <p className="mt-3 text-sm text-secondary">{t("intro")}</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <label htmlFor="album-password" className="sr-only">
            {t("label")}
          </label>
          <input
            id="album-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
            autoFocus
            placeholder={t("label")}
            aria-invalid={error === "wrong"}
            aria-describedby={error ? "album-password-error" : undefined}
            className="w-full rounded border border-white/15 bg-black/40 px-4 py-3 text-sm text-primary outline-none transition-colors placeholder:text-secondary/60 focus:border-accent"
          />

          {error ? (
            <p
              id="album-password-error"
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
    </section>
  );
}
