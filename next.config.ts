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
