import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix workspace root detection - Next.js was detecting wrong root due to lockfile in parent directory
  // Explicitly set the Turbopack root to the current directory (urbansimple folder)
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async redirects() {
    return [
      // Old WordPress URL redirects
      { source: '/cleaning-services', destination: '/landing#services', permanent: true },
      { source: '/cleaning-services/:path*', destination: '/landing#services', permanent: true },
      { source: '/our-team', destination: '/our-team', permanent: false },
      { source: '/contact-us', destination: '/landing#contact', permanent: true },
      { source: '/why-us', destination: '/landing#why-us', permanent: true },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/app/login',
        destination: '/login',
      },
    ];
  },
};

export default nextConfig;
