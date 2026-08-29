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
          <SmoothScroll >
            {/* Both are fixed-position and sized for a real viewport; inside
                the narrow CMS preview panel they cover the content being
                previewed. The footer stays — it is CMS-editable itself. */}
            <HideInPreview>
              <Navbar />
            </HideInPreview>
            {/* Bottom padding on phones only, so the fixed tab bar rests over
                empty space rather than the last line of a section. */}
            <main className="pb-20 md:pb-0">{children}</main>
            <FooterSection />
            <HideInPreview>
              <MobileTabBar />
            </HideInPreview>
          </SmoothScroll>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
