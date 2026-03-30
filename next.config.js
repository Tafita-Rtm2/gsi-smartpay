/** @type {import('next').NextConfig} */
const nextConfig = {
  // Le mode export génère un dossier "out/" qui contient uniquement du HTML/CSS/JS statique.
  // C'est parfait pour cPanel car cela évite toutes les erreurs "Module not found" liées à Next.js runtime.
  output: 'export',

  // Le basePath est critique car l'URL est groupegsi.mg/gsi-smartpay/
  basePath: '/gsi-smartpay',

  // trailingSlash: true est nécessaire pour que les dossiers statiques fonctionnent bien sur Apache
  trailingSlash: true,

  images: {
    // Requis pour 'output: export'
    unoptimized: true,
  },

  // On garde ces options pour la stabilité globale du build
  swcMinify: false,
}

module.exports = nextConfig
