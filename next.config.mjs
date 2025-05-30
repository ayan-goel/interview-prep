/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // For newer Next.js versions using Server Actions
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
}

export default nextConfig
