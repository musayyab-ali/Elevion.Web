/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
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
  // Browser (HTTPS/Vercel) cannot call HTTP APIs directly (mixed content).
  // Proxy same-origin /api-backend/* → backend HTTP API.
  async rewrites() {
    const backend =
      process.env.API_BACKEND_URL?.trim() ||
      process.env.NEXT_PUBLIC_API_KEY?.trim() ||
      "http://thelink.innovex.biz";

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
