import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Cache Components (PPR) off: this app is dynamic/client-heavy, and its
     static-purity rules add friction without benefit here. */
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
