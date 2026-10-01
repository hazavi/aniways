import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false, // enable/disable dev indicators 
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "artworks.thetvdb.com",
      },
      {
        protocol: "https",
        hostname: "cdn.anidb.net",
      },
      {
        protocol: "https",
        hostname: "s4.anilist.co",
      },
    ],
  },
};

export default nextConfig;
