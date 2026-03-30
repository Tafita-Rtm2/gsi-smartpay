# Guide de Déploiement cPanel (Next.js Standalone) - GSI SmartPay

Si vous obtenez une erreur **503 Service Unavailable**, cela signifie généralement que le serveur Node.js ne parvient pas à démarrer ou s'arrête immédiatement après le lancement.

Voici la structure exacte et les étapes pour corriger ce problème sur cPanel.

## 1. Préparation Locale

1.  Assurez-vous que `next.config.js` est configuré ainsi :
    ```js
    module.exports = {
      output: 'standalone',
      basePath: '/gsi-smartpay',
      assetPrefix: '/gsi-smartpay',
    }
    ```
2.  Générez le build : `npm run build`

## 2. Transfert des fichiers vers cPanel

Allez dans votre dossier de destination (ex: `public_html/gsi-smartpay/` ou `domains/votre-domaine.mg/gsi-smartpay/`).

**Vous devez copier les éléments suivants depuis votre PC :**

1.  Tout le contenu du dossier `.next/standalone/` vers la racine du dossier cPanel.
    *(Cela inclut `server.js`, `package.json` et un dossier `node_modules` spécifique).*
2.  Le dossier `public/` (situé à la racine de votre projet sur PC) vers la racine du dossier cPanel.
3.  Le dossier `.next/static/` (situé dans `.next/` sur votre PC) vers le dossier `.next/static/` sur cPanel.

**Structure finale sur le serveur :**
```text
gsi-smartpay/
├── .next/
│   ├── server/
│   ├── static/          <-- COPIÉ DEPUIS .next/static
│   └── ...
├── node_modules/        <-- COPIÉ DEPUIS .next/standalone/node_modules
├── public/              <-- COPIÉ DEPUIS la racine du projet PC
├── .env                 <-- CRÉÉ MANUELLEMENT (voir section 3)
├── package.json
└── server.js
```

## 3. Configuration Node.js dans cPanel

1.  **Version de Node** : Choisissez **18.x** ou **20.x**.
2.  **Application Startup file** : `server.js`
3.  **Variables d'Environnement** (À ajouter dans l'interface cPanel) :
    - `GSI_DATABASE_URL` : `https://groupegsi.mg/rtmggmg/api/db`
    - `GSI_ADMIN_PASSWORD` : `Nina GSI`
    - `NODE_ENV` : `production`
    - `HOSTNAME` : `127.0.0.1`

## 4. Pourquoi l'erreur 503 ? (Checklist de résolution)

*   **Fichiers manquants** : L'erreur 503 arrive souvent si `node_modules` n'est pas présent à côté de `server.js`. Assurez-vous d'avoir copié celui qui est **dans** `.next/standalone/`.
*   **Permissions** : Vérifiez que les dossiers ont les permissions `755` et les fichiers `644`.
*   **Conflit de Port** : Next.js essaie de démarrer sur le port 3000 par défaut. cPanel gère cela automatiquement via Passenger, mais assurez-vous de ne pas avoir de variable `PORT` qui bloque le démarrage.
*   **Logs d'erreurs** : Dans l'interface "Setup Node.js App", cherchez un lien vers les fichiers de logs (stderr.log). C'est là que la véritable erreur est écrite.
*   **Restart** : Cliquez sur le bouton **"Restart"** après chaque changement de fichier ou de variable.

## 5. Astuce pour le CSS (Si le site charge sans design)
Si les styles (CSS) ne s'affichent pas, vérifiez que vous avez bien un dossier `static` dans `gsi-smartpay/.next/static/`.
