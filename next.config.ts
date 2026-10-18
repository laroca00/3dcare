import type { NextConfig } from "next";

// Set BASE_PATH=/3dcare when the site is served from laroca00.github.io/3dcare.
// Leave it empty once the custom domain is live.
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  // One 404 page for every unknown address (see src/app/global-not-found.tsx).
  experimental: { globalNotFound: true },
};

export default nextConfig;
