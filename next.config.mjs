/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  // La extension no tiene servidor de imagenes: sin optimizacion de next/image.
  images: { unoptimized: true },
  // chrome-extension://<id>/ es el origen raiz, asi que las rutas absolutas
  // que genera Next (/_next/...) resuelven bien sin tocar assetPrefix.
  trailingSlash: false,
  reactStrictMode: true,
};

export default nextConfig;
