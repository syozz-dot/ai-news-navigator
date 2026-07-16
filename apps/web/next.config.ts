import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ai-news-navigator/database"],
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
