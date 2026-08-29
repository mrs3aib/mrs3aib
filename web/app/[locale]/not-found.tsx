import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

function LostFrameIllustration() {
  return (
    <svg
      viewBox="0 0 520 330"
      role="img"
      aria-label=""
      className="h-auto w-full max-w-xl"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="gold-stroke" x1="56" y1="43" x2="452" y2="294" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E3C083" />
          <stop offset="1" stopColor="#9A713B" />
        </linearGradient>
        <linearGradient id="frame-fill" x1="120" y1="78" x2="400" y2="258" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1B1A18" />
          <stop offset="1" stopColor="#090909" />
        </linearGradient>
      </defs>

      <path d="M46 279H474" stroke="url(#gold-stroke)" strokeOpacity=".36" />
      <path d="M87 296H433" stroke="url(#gold-stroke)" strokeOpacity=".13" />
      <circle cx="87" cy="279" r="3" fill="#D9B473" />
      <circle cx="433" cy="296" r="3" fill="#D9B473" />

      <path d="M260 45v28M246 59h28" stroke="#D9B473" strokeOpacity=".75" strokeWidth="1.5" />
      <path d="M72 98v19M62.5 107.5h19M447 126v19M437.5 135.5h19" stroke="#D9B473" strokeOpacity=".45" strokeWidth="1.5" />

      <rect x="113" y="79" width="294" height="184" rx="17" fill="url(#frame-fill)" stroke="url(#gold-stroke)" strokeOpacity=".72" />
      <path d="M146 228l54-51 38 33 43-57 67 75" stroke="#D9B473" strokeOpacity=".65" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="317" cy="135" r="16" stroke="#D9B473" strokeOpacity=".7" strokeWidth="2" />
      <path d="M317 113v44M295 135h44" stroke="#D9B473" strokeOpacity=".44" />

      <path d="M198 79l14-22h97l14 22" stroke="url(#gold-stroke)" strokeOpacity=".72" />
      <rect x="219" y="65" width="82" height="10" rx="5" fill="#151311" stroke="#D9B473" strokeOpacity=".35" />
      <circle cx="260" cy="171" r="50" fill="#0B0B0B" stroke="url(#gold-stroke)" strokeWidth="2" />
      <circle cx="260" cy="171" r="34" stroke="#D9B473" strokeOpacity=".62" strokeWidth="2" />
      <circle cx="260" cy="171" r="11" fill="#D9B473" fillOpacity=".75" />
      <path d="M142 113h13M365 113h13" stroke="#D9B473" strokeOpacity=".7" strokeWidth="3" strokeLinecap="round" />

      <text x="260" y="319" textAnchor="middle" fill="#D9B473" fillOpacity=".88" fontSize="12" fontFamily="Arial, sans-serif" letterSpacing="5">
        FRAME NOT FOUND
      </text>
    </svg>
  );
}

/**
 * Shown when `notFound()` fires inside a localized route — an album id that
 * matches no published session, or a category that does not exist.
 *
 * Without this file Next falls back to its own global not-found page, which
 * renders outside the locale layout: unstyled, untranslated, and served with a
 * 200 status, which tells search engines the URL is a real page worth
 * indexing. Demo albums used to make this unreachable for album URLs, since
 * every id resolved to something.
 */
export default async function LocaleNotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="relative isolate flex min-h-svh items-center overflow-hidden bg-base px-6 py-32 md:px-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_42%,rgba(201,158,90,0.12),transparent_33%),linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-24 -z-10 h-px bg-linear-to-r from-transparent via-accent/35 to-transparent" />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
        <div className="order-2 text-center lg:order-1 lg:text-start">
          <p className="tracking-nav mb-5 flex items-center justify-center gap-3 text-xs font-medium uppercase text-accent lg:justify-start">
            <span className="h-px w-8 bg-accent/80" />
            404
          </p>
          <h1 className="font-display text-4xl font-semibold leading-tight text-primary md:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-secondary md:text-base lg:max-w-lg">
            {t("body")}
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-lg bg-accent px-6 text-sm font-semibold text-black transition-colors hover:bg-accent/90"
          >
            {t("home")}
          </Link>
        </div>

        <div className="order-1 rounded-2xl border border-accent/25 bg-black/35 p-5 shadow-2xl shadow-black/20 backdrop-blur-sm sm:p-8 lg:order-2">
          <LostFrameIllustration />
        </div>
      </div>
    </main>
  );
}
