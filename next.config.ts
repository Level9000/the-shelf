import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Cover photo uploads (src/lib/actions/cover-photo-actions.ts) enforce an
      // 8MB limit themselves — this must be at least that, or Next.js's default
      // 1MB Server Action body cap silently kills uploads before that check runs.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
