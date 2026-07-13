/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true, // gzip all JSON/HTML responses (~60-70% payload reduction)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Serve up to 4K resolution
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512],
    // WebP for best quality + compression
    formats: ['image/webp'],
  },
}

module.exports = nextConfig