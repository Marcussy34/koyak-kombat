/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',       // <--- ADD THIS: Creates the "out" folder
  images: {
    unoptimized: true,    // <--- ADD THIS: Fixes images on free hosting
  },
};

export default nextConfig;