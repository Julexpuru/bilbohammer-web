/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.bilbohammer.es",
      },
    ],
    unoptimized: true,
  },
  // Server Actions ya vienen activadas por defecto; no hace falta 'experimental'
};

export default nextConfig;
