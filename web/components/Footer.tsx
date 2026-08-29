"use client";

import { FormEvent } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { navLinks } from "@/lib/data";
import { scrollToId } from "@/lib/scroll";
import type { CmsFooter } from "@/lib/cms";

/**
 * One social link. Renders nothing when the CMS has no URL for it — an icon
 * that goes nowhere is worse than an absent icon.
 */
function FooterIcon({
  children,
  href,
  label
}: {
  children: ReactNode;
  href?: string;
  label: string;
}) {
  if (!href) return null;

  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noreferrer"
      className="flex h-10 w-10 items-center justify-center rounded border border-white/10 bg-black/55 text-xs font-semibold text-primary transition-colors duration-300 hover:border-accent hover:text-accent"
    >
      {children}
    </a>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
      <rect
        x="4.5"
        y="4.5"
        width="15"
        height="15"
        rx="4.2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="3.3" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="16.7" cy="7.3" r="1" fill="currentColor" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
      <path
        d="M21 12s0-3.4-.45-4.9a2.5 2.5 0 0 0-1.75-1.75C17.3 4 12 4 12 4s-5.3 0-6.8.35A2.5 2.5 0 0 0 3.45 6.1C3 7.6 3 12 3 12s0 4.4.45 5.9a2.5 2.5 0 0 0 1.75 1.75C6.7 20 12 20 12 20s5.3 0 6.8-.35a2.5 2.5 0 0 0 1.75-1.75C21 16.4 21 12 21 12Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="m10.2 8.9 5 3.1-5 3.1V8.9Z" fill="currentColor" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
      <path
        d="M14.5 4v10.3a4.2 4.2 0 1 1-3.9-4.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 4c.55 2.9 2.25 4.55 5 4.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
      <path
        d="M5.5 19 6.6 15.8A7.2 7.2 0 1 1 9 18.1L5.5 19Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 8.6c.2-.45.4-.48.7-.48h.5c.15 0 .35.03.52.4l.72 1.72c.08.2.05.37-.08.55l-.35.45c-.1.13-.12.28-.02.43.33.58.86 1.15 1.42 1.48.17.1.32.08.45-.05l.5-.43c.15-.13.35-.15.53-.07l1.62.75c.32.15.42.35.37.63-.12.68-.73 1.3-1.4 1.38-.9.1-2.82-.3-4.7-2.18-1.88-1.88-2.28-3.8-2.18-4.7.08-.62.55-1.18 1.18-1.38Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
      <path
        d="M20.7 4.4 3.9 10.9c-.7.27-.68 1.27.03 1.5l4.2 1.36 1.6 4.9c.2.6.97.77 1.4.3l2.3-2.42 4.1 3.02c.5.37 1.22.1 1.36-.5l3-13.3c.15-.68-.5-1.24-1.15-.97Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m8.13 13.76 10.2-7.1-6.9 8.9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SnapchatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
      <path
        d="M12 3.4c2.3 0 3.9 1.75 3.9 4v2.3c.55.35 1.15.2 1.72-.05.5-.22 1.03.15 1 .68-.03.5-.5.8-1 1-.65.25-1.3.45-1.3.9 0 .9 2 2.8 3.2 3.15.35.1.4.55.1.75-.7.45-1.7.6-2.2.8-.28.1-.2.45-.35.8-.1.25-.35.35-.75.28-.5-.1-1.2-.25-1.9-.05-.65.18-1.15.95-2.42.95s-1.77-.77-2.42-.95c-.7-.2-1.4-.05-1.9.05-.4.07-.65-.03-.75-.28-.15-.35-.07-.7-.35-.8-.5-.2-1.5-.35-2.2-.8-.3-.2-.25-.65.1-.75 1.2-.35 3.2-2.25 3.2-3.15 0-.45-.65-.65-1.3-.9-.5-.2-.97-.5-1-1-.03-.53.5-.9 1-.68.57.25 1.17.4 1.72.05V7.4c0-2.25 1.6-4 3.9-4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** X, formerly Twitter. */
function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
      <path
        d="M4.2 4h3.6l4.3 5.9L17.6 4h2.1l-6.4 7.3L20.3 20h-3.6l-4.6-6.3L6.3 20H4.2l6.8-7.7L4.2 4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="2.6"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8 11v5.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="8" cy="8.1" r="1.05" fill="currentColor" />
      <path
        d="M11.5 16.2V11m0 1.5c.3-.9 1.05-1.5 2.1-1.5 1.35 0 2.4.9 2.4 2.5v2.7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
      <path
        d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
      <path
        d="M8.4 5.3 10 8.9a1.3 1.3 0 0 1-.32 1.45l-1.15 1.02a10.2 10.2 0 0 0 4.1 4.1l1.02-1.15A1.3 1.3 0 0 1 15.1 14l3.6 1.6a1.35 1.35 0 0 1 .77 1.5l-.45 2.1a1.6 1.6 0 0 1-1.7 1.25C9.35 19.65 4.35 14.65 3.55 6.68a1.6 1.6 0 0 1 1.25-1.7l2.1-.45a1.35 1.35 0 0 1 1.5.77Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
      <rect
        x="3.5"
        y="5.5"
        width="17"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="m4.5 7 7.5 6 7.5-6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none">
      <path
        d="m4 12.5 16-7-6.2 15-2.5-6.1L4 12.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m11.3 14.4 3.4-3.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Footer({
  content
}: {
  content?: CmsFooter;
}) {
  const t = useTranslations("footer");
  const tn = useTranslations("nav");
  const year = new Date().getFullYear();

  // Every field falls back to its translated default, so a blank CMS value
  // means "keep the built-in copy" rather than rendering an empty footer.
  const location = content?.location || t("location");
  const phone = content?.phone || t("phone");
  const email = content?.email || t("email");
  const social = content?.social;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <footer className="border-t border-line bg-black/35">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-4 md:px-10">
        <div>
          <p className="font-display text-lg font-semibold text-accent">
            {content?.newsletterTitle || t("newsletterTitle")}
          </p>
          <p className="mt-3 text-sm leading-6 text-secondary">
            {content?.newsletterText || t("newsletterText")}
          </p>
          <form
            onSubmit={submit}
            className="mt-6 flex h-12 overflow-hidden rounded border border-white/10 bg-black/55"
          >
            <input
              type="email"
              aria-label={t("emailPlaceholder")}
              placeholder={t("emailPlaceholder")}
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-primary outline-none placeholder:text-secondary/60"
            />
            <button
              type="submit"
              aria-label={t("subscribe")}
              className="flex w-14 items-center justify-center border-s border-white/10 text-accent transition-colors hover:bg-accent hover:text-black"
            >
              <SendIcon />
            </button>
          </form>
        </div>

        <div>
          <p className="font-display text-lg font-semibold text-accent">
            {content?.quickLinks || t("quickLinks")}
          </p>
          <ul className="mt-5 flex flex-col gap-3">
            {navLinks.map((link) => (
              <li key={link.key}>
                <a
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToId(link.href);
                  }}
                  className="text-sm text-secondary transition-colors duration-300 hover:text-accent"
                >
                  {tn(link.key)}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-display text-lg font-semibold text-accent">
            {content?.contactTitle || t("contactTitle")}
          </p>
          <ul className="mt-5 flex flex-col gap-4 text-sm text-secondary">
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center text-accent">
                <LocationIcon />
              </span>
              <span>{location}</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center text-accent">
                <PhoneIcon />
              </span>
              <a
                href={`tel:${phone.replace(/[^+\d]/g, "")}`}
                className="hover:text-accent"
              >
                {phone}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center text-accent">
                <MailIcon />
              </span>
              <a href={`mailto:${email}`} className="hover:text-accent">
                {email}
              </a>
            </li>
          </ul>
        </div>

        <div id="social-accounts" className="scroll-mt-24">
          <p className="font-display text-lg font-semibold text-accent">
            {content?.followTitle || t("followTitle")}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <FooterIcon label="Instagram" href={social?.instagramUrl}>
              <InstagramIcon />
            </FooterIcon>
            <FooterIcon label="YouTube" href={social?.youtubeUrl}>
              <YouTubeIcon />
            </FooterIcon>
            <FooterIcon label="TikTok" href={social?.tiktokUrl}>
              <TikTokIcon />
            </FooterIcon>
            <FooterIcon label="WhatsApp" href={social?.whatsappUrl}>
              <WhatsAppIcon />
            </FooterIcon>
            <FooterIcon label="Telegram" href={social?.telegramUrl}>
              <TelegramIcon />
            </FooterIcon>
            <FooterIcon label="Snapchat" href={social?.snapchatUrl}>
              <SnapchatIcon />
            </FooterIcon>
            <FooterIcon label="X (Twitter)" href={social?.twitterUrl}>
              <TwitterIcon />
            </FooterIcon>
            <FooterIcon label="LinkedIn" href={social?.linkedinUrl}>
              <LinkedInIcon />
            </FooterIcon>
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl justify-center px-6 py-5 text-center md:px-10">
          <p className="text-xs text-secondary">
            {t("copyright", { year })}
          </p>
        </div>
      </div>
    </footer>
  );
}
