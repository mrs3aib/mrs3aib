import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import {
  Inter,
  Space_Grotesk,
  Noto_Sans_Arabic
} from "next/font/google";
import { routing } from "@/i18n/routing";
import SmoothScroll from "@/components/SmoothScroll";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import MobileTabBar from "@/components/MobileTabBar";
import { HideInPreview } from "@/components/CmsPreviewBridge";
import RouteLoader from "@/components/RouteLoader";
import VisitTracker from "@/components/VisitTracker";
import { getCmsCategories } from "@/lib/api";
import { categories as fallbackCategories } from "@/lib/data";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap"
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
  display: "swap"
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    /**
     * Required for `og:image` to be emitted as an absolute URL. Without it
     * Next renders a relative path, which every link-preview crawler ignores —
     * so a shared link showed no image regardless of what the page declared.
     */
    ...(process.env.NEXT_PUBLIC_SITE_URL
      ? { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL) }
      : {}),
    title: t("title"),
    description: t("description"),
    icons: {
      icon: "/logo2.svg"
    }
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  /**
   * Categories the CMS still shows, resolved once for everything chrome-level.
   * The nav used the hardcoded list, so a category hidden in the CMS kept its
   * menu entry and led visitors to a 404.
   */
  const tCategories = await getTranslations({ locale, namespace: "categories" });
  const categoryItems = await getCmsCategories(fallbackCategories, (id) =>
    tCategories(id)
  );

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${inter.variable} ${spaceGrotesk.variable} ${notoSansArabic.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-base text-primary antialiased">
        <NextIntlClientProvider messages={messages}>
          <RouteLoader />
          {/* Records one view per navigation. Renders nothing, and is inert
              inside the CMS preview frame so admin previews are not counted
              as visitor traffic. */}
          <VisitTracker />
          <SmoothScroll >
            {/* Both are fixed-position and sized for a real viewport; inside
                the narrow CMS preview panel they cover the content being
                previewed. The footer stays — it is CMS-editable itself. */}
            <HideInPreview>
              <Navbar categoryItems={categoryItems} />
            </HideInPreview>
            <main>{children}</main>
            <FooterSection />
            {/*
              Clearance for the fixed tab bar, on phones only.

              This used to be bottom padding on `<main>`, which put the gap in
              the wrong place twice over: it opened a band of empty space
              between the page and the footer, and because the footer renders
              after `</main>` the bar still covered its last rows. Spacing the
              end of the document instead leaves the page flush against the
              footer and the footer fully readable above the bar.
            */}
            <HideInPreview>
              <div aria-hidden="true" className="h-20 md:hidden" />
              <MobileTabBar categoryItems={categoryItems} />
            </HideInPreview>
          </SmoothScroll>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
