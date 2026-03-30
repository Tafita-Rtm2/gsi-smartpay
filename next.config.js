/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: '/gsi-smartpay',

  images: {
    // Très important pour cPanel : désactive l'optimisation native qui demande 'sharp'
    unoptimized: true,
  },

  // On désactive le swcMinify qui peut parfois créer des builds corrompus sur certains serveurs Linux/Node anciens
  // Cela force un build plus standard et stable
  swcMinify: false,

  // Désactive la compression par défaut si cPanel/Apache s'en charge déjà,
  // ce qui évite des bugs de double compression (Gzip)
  compress: false,

  // Option pour garantir que les dépendances sont bien isolées pour le mode standalone
  experimental: {
    outputFileTracingRoot: process.cwd(),
  },
}

module.exports = nextConfig
