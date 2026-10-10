import type { MetadataRoute } from "next";
import { BRAND_NAME } from "@/lib/config";
import { getServerTheme } from "@/lib/theme";

/** Lets customers "install" the shop on their phone; name and colours come from the tenant's configuration. */
export default function manifest(): MetadataRoute.Manifest {
  const theme = getServerTheme();
  return {
    name: BRAND_NAME,
    short_name: BRAND_NAME.slice(0, 12),
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: theme.black,
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
