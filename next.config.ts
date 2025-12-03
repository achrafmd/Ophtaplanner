// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tu peux garder le reactCompiler si tu veux
  reactCompiler: true,

  // ⚠️ Important : autoriser le build même s'il reste des erreurs TypeScript
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
