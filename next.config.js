/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: '/gsi-smartpay',
  assetPrefix: '/gsi-smartpay', // Important for assets in subdirectory
}

module.exports = nextConfig
