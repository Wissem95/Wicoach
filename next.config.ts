import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next build` still runs the TypeScript compiler (the real safety net).
  // We skip the ESLint pass during build to avoid eslint-9/flat-config
  // friction on Vercel; run `npm run lint` locally for full linting.
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.openfoodfacts.org" },
    ],
  },
};

export default nextConfig;
