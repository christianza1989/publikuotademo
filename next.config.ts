import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ideogram.ai',
        port: '',
        pathname: '/api/images/ephemeral/**',
      },
    ],
  },
};

export default nextConfig;
