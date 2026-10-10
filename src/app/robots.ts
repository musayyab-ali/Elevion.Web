import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

/** Search engines may read the shop, but not the customer area, checkout or the API proxy. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/my-account", "/checkout", "/cart", "/payment", "/PaymentResponse", "/order", "/api-backend"],
      },
    ],
    ...(SITE_URL ? { sitemap: `${SITE_URL.replace(/\/+$/, "")}/sitemap.xml`, host: SITE_URL } : {}),
  };
}
