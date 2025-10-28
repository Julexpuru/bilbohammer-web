/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Server Actions ya vienen activadas por defecto; no hace falta 'experimental'
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
