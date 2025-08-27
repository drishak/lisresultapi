import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["oracledb", "better-sqlite3"],

  eslint: {
    // ✅ This will ignore ESLint errors during `next build`
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
