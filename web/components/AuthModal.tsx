"use client";

import { type FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { CloseIcon } from "./icons";

type AuthMode = "login" | "signup";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  onComplete: (user: { name: string; phone: string }) => void;
};

export default function AuthModal({ open, onClose, onComplete }: AuthModalProps) {
  const t = useTranslations("auth");
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const isSignup = mode === "signup";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fallbackName = phone.slice(-4)
      ? `${t("guestName")} ${phone.slice(-4)}`
      : t("guestName");
    onComplete({
      name: isSignup ? name.trim() || fallbackName : fallbackName,
      phone
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto overscroll-contain bg-black/40 px-4 pb-16 pt-8 backdrop-blur-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
          data-lenis-prevent
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative  w-full max-w-md overflow-hidden rounded border border-white/15 bg-card/90 p-6 shadow-2xl shadow-black/50 md:p-8"
          >
            <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
            <button
              type="button"
              aria-label={t("close")}
              onClick={onClose}
              className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded border border-white/10 text-secondary transition-colors hover:border-white/30 hover:text-primary rtl:left-5 rtl:right-auto"
            >
              <CloseIcon className="h-4 w-4" />
            </button>

            <div className="pr-12 rtl:pl-12 rtl:pr-0">
              <p className="tracking-nav text-xs font-medium uppercase text-accent">
                {t("eyebrow")}
              </p>
              <h2
                id="auth-modal-title"
                className="tracking-title mt-3 font-display text-3xl font-semibold text-primary"
              >
                {isSignup ? t("signupTitle") : t("loginTitle")}
              </h2>
              <p className="mt-3 text-sm leading-7 text-secondary">
                {isSignup ? t("signupText") : t("loginText")}
              </p>
            </div>

            <div className="mt-7 grid grid-cols-2 rounded border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`rounded px-4 py-2 text-xs font-medium transition-all ${
                  !isSignup
                    ? "bg-white text-black"
                    : "text-secondary hover:text-primary"
                }`}
              >
                {t("loginTab")}
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`rounded px-4 py-2 text-xs font-medium transition-all ${
                  isSignup
                    ? "bg-white text-black"
                    : "text-secondary hover:text-primary"
                }`}
              >
                {t("signupTab")}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {isSignup ? (
                <label className="block">
                  <span className="tracking-nav text-[10px] font-medium uppercase text-secondary">
                    {t("name")}
                  </span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-primary outline-none transition-colors placeholder:text-secondary/60 focus:border-accent"
                    placeholder={t("namePlaceholder")}
                  />
                </label>
              ) : null}

              <label className="block">
                <span className="tracking-nav text-[10px] font-medium uppercase text-secondary">
                  {t("phone")}
                </span>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-primary outline-none transition-colors placeholder:text-secondary/60 focus:border-accent"
                  placeholder={t("phonePlaceholder")}
                />
              </label>

              <label className="block">
                <span className="tracking-nav text-[10px] font-medium uppercase text-secondary">
                  {t("password")}
                </span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-primary outline-none transition-colors placeholder:text-secondary/60 focus:border-accent"
                  placeholder={t("passwordPlaceholder")}
                />
              </label>

              <button
                type="submit"
                className="btn-gold-border mt-2 inline-flex w-full items-center justify-center rounded bg-white px-6 py-3 text-sm font-semibold text-black transition-transform duration-300 hover:scale-[1.02]"
              >
                {isSignup ? t("signupSubmit") : t("loginSubmit")}
              </button>
            </form>

            <p className="mt-5 text-center text-xs leading-6 text-secondary">
              {t("privacy")}
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
