import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false, // enable/disable dev indicators 
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.myanimelist.net",
      },
      {
        protocol: "https",
        hostname: "i.animepahe.ru",
      },
       {
        protocol: "https",
        hostname: "i.animepahe.si",
      },
      {
        protocol: "https",
        hostname: "i.animepahe.pw",
      },
    ],
  },
};

export default nextConfig;
