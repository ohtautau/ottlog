import type { NextConfig } from "next";
import { getApiOrigin } from "./src/lib/api-origin";

const nextConfig: NextConfig = {
  distDir: process.env.OTTLOG_NEXT_DIST_DIR || ".next",
  output: process.env.NEXT_STANDALONE === "true" ? "standalone" : undefined,
  async rewrites() {
    const origin = getApiOrigin();
    return [...["images", "api"].map(prefix => ({ source: `/${prefix}/:path*`, destination: `${origin}/${prefix}/:path*` })), { source: "/feed.xml", destination: `${origin}/api/feed` }];
  },
};

export default nextConfig;
