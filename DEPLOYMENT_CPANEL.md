# Guide de Déploiement cPanel (Mode Standalone)

Ce projet est configuré pour le déploiement sur cPanel via un serveur Node.js. Voici les étapes exactes après avoir généré votre build (par exemple sur GitHub ou localement).

## 1. Préparation du Build

Exécutez la commande suivante (déjà configurée dans `next.config.js`) :
```bash
npm run build
```

Cela va créer un dossier `.next/standalone`.

## 2. Structure finale sur le serveur

Pour que le site fonctionne dans le dossier `/gsi-smartpay` de votre hébergement, vous devez organiser vos fichiers exactement comme suit à la racine de votre application Node.js sur cPanel :

```text
/public_html/gsi-smartpay/ (ou votre dossier d'application)
├── server.js               <-- (Copié depuis .next/standalone/server.js)
├── package.json            <-- (Le package.json d'origine)
├── .env                    <-- (Vos variables d'environnement de production)
├── public/                 <-- (Copié depuis la racine du projet)
│   └── favicon.ico, etc.
└── .next/
    └── static/             <-- (Copié depuis .next/static)
```

### IMPORTANT : Copie des fichiers statiques
Next.js en mode `standalone` ne copie pas automatiquement les fichiers statiques. Vous **DEVEZ** copier manuellement :
1. Le contenu de `.next/standalone` vers la racine de votre application.
2. Le dossier `public/` (à la racine du projet) vers la racine de votre application.
3. Le dossier `.next/static/` vers `.next/static/` dans votre dossier d'application.

## 3. Configuration de l'Application Node.js sur cPanel

1. **Application root** : `/public_html/gsi-smartpay`
2. **Application URL** : `votre-domaine.com/gsi-smartpay`
3. **Application startup file** : `server.js`
4. **Environment variables** (À configurer dans l'interface cPanel "Setup Node.js App") :
   - `NODE_ENV`: `production`
   - `PORT`: (laissez cPanel gérer automatiquement)
   - `GSI_DATABASE_URL`: (votre URL de base de données)
   - `GSI_ADMIN_PASSWORD`: `Nina GSI`

*Note : Le fichier `server.js` de Next.js ne lit pas automatiquement le fichier `.env`. Il est donc préférable de saisir ces variables directement dans l'interface cPanel.*

## 4. Troubleshooting (Erreurs fréquentes)

- **Erreur 503** : Vérifiez que `server.js` est bien à la racine et que vous avez installé les dépendances si nécessaire (bien qu'en mode standalone, le dossier `node_modules` est déjà inclus dans `.next/standalone/node_modules`).
- **Images/CSS manquants** : Assurez-vous d'avoir bien copié le dossier `public` et `.next/static` comme indiqué à l'étape 2.
- **Chemins de l'API** : Le site utilise `/gsi-smartpay/api/db`. Si vous changez le dossier sur cPanel, assurez-vous que `basePath` dans `next.config.js` correspond.
