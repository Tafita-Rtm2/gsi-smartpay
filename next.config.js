/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: '/gsi-smartpay',
  // On retire assetPrefix car basePath le gère déjà pour 99% des cas
  // et assetPrefix peut causer des conflits de chemins sur certains serveurs Apache/cPanel

  images: {
    // Très important pour cPanel : désactive l'optimisation native qui demande 'sharp'
    // 'sharp' demande des librairies système (libvips) souvent absentes sur cPanel, causant un crash (503)
    unoptimized: true,
  },
}

module.exports = nextConfig
