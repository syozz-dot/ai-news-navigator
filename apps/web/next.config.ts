import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@ai-news-navigator/database",
    "@ai-news-navigator/intelligence",
    "@ai-news-navigator/jobs",
    "@ai-news-navigator/pipeline",
    "@ai-news-navigator/sources",
  ],
  webpack(config) {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    };
    return config;
  },
};

export default nextConfig;
