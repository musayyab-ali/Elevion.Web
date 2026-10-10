/** @type {import('next').NextConfig} */

const siteIsHttps = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().startsWith("https://");

// Headers every page gets. A strict Content-Security-Policy is deliberately not set yet: payment pages load
// third-party scripts (Stripe / PayPal) and need a tested allow-list first.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(self)" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // only meaningful (and only safe) once the site itself is served over https
  ...(siteIsHttps
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "thelink.innovex.biz",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "thelink.innovex.biz",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
    // The browser talks to /api-backend (src/app/api-backend), a server route that forwards to the API.
};

module.exports = nextConfig;
