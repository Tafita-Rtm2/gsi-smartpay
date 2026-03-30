/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output standalone est parfait pour cPanel car il isole tout ce qui est nécessaire
  output: 'standalone',

  // Le basePath est critique car l'URL est groupegsi.mg/gsi-smartpay/
  basePath: '/gsi-smartpay',

  // trailingSlash: true aide à résoudre les redirections infinies sur Apache (cPanel)
  trailingSlash: true,

  images: {
    // Désactive l'optimisation native (évite l'erreur 'sharp' sur cPanel)
    unoptimized: true,
  },

  // swcMinify: false peut éviter des plantages sur certains environnements cPanel/Node anciens
  swcMinify: false,

  // Désactive la compression gzip par défaut car cPanel s'en charge via Apache (évite double compression)
  compress: false,

  // Assure que le tracing des fichiers pour standalone fonctionne depuis la racine du projet
  experimental: {
    outputFileTracingRoot: process.cwd(),
  },
}

module.exports = nextConfig
