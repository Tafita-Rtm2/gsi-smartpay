# Guide de Déploiement Définitif pour cPanel (GSI SmartPay)

Ce guide résout les erreurs `ERR_TOO_MANY_REDIRECTS` et `503 Service Unavailable` sur `groupegsi.mg/gsi-smartpay/`.

## 1. Préparation Locale

1.  Vérifiez `next.config.js` :
    - `output: 'standalone'`
    - `basePath: '/gsi-smartpay'`
    - `trailingSlash: true`
2.  Lancez le build : `npm run build`
3.  Le build est généré dans `.next/standalone` et `.next/static`.

## 2. Structure des fichiers sur cPanel

Dans votre dossier d'application sur cPanel (ex: `public_html/gsi-smartpay/`), placez les fichiers comme suit :

1.  **Copiez tout le contenu de `.next/standalone/`** directement à la racine de votre dossier cPanel.
2.  **Copiez le dossier `public/`** (du projet racine) à la racine de votre dossier cPanel.
3.  **Copiez le dossier `.next/static/`** (du projet racine) vers `.next/static/` sur cPanel.
4.  **REMPLACEZ le `server.js`** généré par Next.js par le **`server.js` personnalisé** que j'ai créé (celui qui contient `require('dotenv').config()`).
5.  **Créez un fichier `.env`** à la racine avec vos accès secrets.

### Arborescence Finale sur cPanel :
```text
/gsi-smartpay
├── .env                  <-- Vos secrets ici (DATABASE_URL, etc.)
├── server.js             <-- LE SERVER.JS PERSONNALISÉ (avec dotenv)
├── package.json
├── .next/
│   ├── server/
│   └── static/           <-- Copié depuis le dossier .next/static local
├── public/               <-- Copié depuis le dossier public local
└── node_modules/         <-- Installés via "npm install" sur cPanel
```

## 3. Configuration Node.js (cPanel)

- **Application Root** : `public_html/gsi-smartpay`
- **Application URL** : `groupegsi.mg/gsi-smartpay`
- **Application Startup File** : `server.js`
- **Node Version** : 18.x ou +
- **Run JS Install** : Cliquez sur ce bouton pour installer les dépendances (dont `dotenv`).

## 4. Sécurité et Performance

Le `server.js` personnalisé assure que :
- Les variables `.env` sont chargées au démarrage.
- Le serveur écoute sur le bon port fourni par cPanel.
- Le `basePath` est respecté pour éviter les erreurs 404/500 sur les routes.
- Le `trailingSlash: true` dans `next.config.js` évite les boucles de redirections infinies d'Apache.
