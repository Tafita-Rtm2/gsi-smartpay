/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: '/gsi-smartpay',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
