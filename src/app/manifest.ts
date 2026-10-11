import type { MetadataRoute } from "next";
import { fetchBranding, themeFor } from "@/lib/branding";

/** Lets customers "install" the shop on their phone; name and colours come from the tenant's configuration. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const branding = await fetchBranding();
  const theme = themeFor(branding);
  return {
    name: branding.shopName,
    short_name: branding.shopName.slice(0, 12),
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: theme.black,
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
