/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // basePath: '/proscan',  // Uncomment if served from subdirectory on Apache
};

export default nextConfig;
