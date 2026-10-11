import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "@/styles/styles.scss";
import GlobalProvider from "./GlobalProvider";
import ModalCart from "@/components/Modal/ModalCart";
import ModalWishlist from "@/components/Modal/ModalWishlist";
import ModalSearch from "@/components/Modal/ModalSearch";
import ModalQuickview from "@/components/Modal/ModalQuickview";
import ModalCompare from "@/components/Modal/ModalCompare";
import CountdownTimeType from "@/type/CountdownType";
import { Toaster } from "react-hot-toast";
import { countdownTime } from "@/store/countdownTime";
import LandingSeo from "@/components/Common/LandingSeo";
import CookieBanner from "@/components/Common/CookieBanner";
import { fetchBranding, themeFor } from "@/lib/branding";
import { BrandingProvider } from "@/context/BrandingContext";
import { themeToCss } from "@/lib/theme";

const serverTimeLeft: CountdownTimeType = countdownTime();

const instrument = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument",
  adjustFontFallback: false,
});
export async function generateMetadata(): Promise<Metadata> {
  const branding = await fetchBranding();
  return { title: branding.shopName };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const branding = await fetchBranding();
  return (
    <GlobalProvider>
      <html lang="en">
        <head>
          <style id="tenant-theme" dangerouslySetInnerHTML={{ __html: themeToCss(themeFor(branding)) }} />
        </head>
        <body className={instrument.className}>
          <BrandingProvider branding={branding}>
            <LandingSeo />
            {children}
            <Toaster position="top-center" />
            <CookieBanner />
            <ModalCart serverTimeLeft={serverTimeLeft} />
            <ModalWishlist />
            <ModalSearch />
            <ModalQuickview />
            <ModalCompare />
          </BrandingProvider>
        </body>
      </html>
    </GlobalProvider>
  );
}
