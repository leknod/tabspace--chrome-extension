/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  // The extension has no image server: no next/image optimization.
  images: { unoptimized: true },
  // chrome-extension://<id>/ is the root origin, so the absolute paths
  // Next generates (/_next/...) resolve fine without touching assetPrefix.
  trailingSlash: false,
  reactStrictMode: true,
};

export default nextConfig;
