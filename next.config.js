/** @type {import('next').NextConfig} */

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
  process.env.NEXT_PUBLIC_API_KEY?.trim() || // legacy name of the same setting
  "";
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
    ignoreDuringBuilds: true,
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
  // Browser (HTTPS/Vercel) cannot call HTTP APIs directly (mixed content).
  // Proxy same-origin /api-backend/* → backend HTTP API.
  async rewrites() {
    const backend =
      process.env.API_BACKEND_URL?.trim() || apiUrl || "http://thelink.innovex.biz";

    const destination = backend.replace(/\/$/, "");

    return [
      {
        source: "/api-backend/:path*",
        destination: `${destination}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
