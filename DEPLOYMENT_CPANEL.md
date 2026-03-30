# Guide de Déploiement Statique + API Express (GSI SmartPay)

Cette méthode est la plus robuste pour cPanel car elle sépare le frontend statique du backend API, évitant ainsi les erreurs `Module not found` de Next.js.

## 1. Préparation Locale

1.  Assurez-vous que `next.config.js` contient `output: 'export'`.
2.  Générez le build statique :
    ```bash
    npm run build
    ```
3.  Cela va créer un dossier nommé `out/` à la racine de votre projet.

## 2. Structure des fichiers sur cPanel

Dans votre dossier d'application sur cPanel (ex: `public_html/gsi-smartpay/`), placez les fichiers comme suit :

1.  **Copiez tout le dossier `out/`** généré localement vers la racine de votre dossier cPanel.
2.  **Copiez le fichier `server.js`** (Express) à la racine de votre dossier cPanel.
3.  **Copiez le fichier `package.json`** à la racine.
4.  **Créez un fichier `.env`** à la racine avec vos accès :
    ```env
    GSI_DATABASE_URL=https://votre-url-api.com
    GSI_ADMIN_PASSWORD=VotreMotDePasse
    NODE_ENV=production
    PORT=3000
    ```

### Arborescence sur cPanel :
```text
/gsi-smartpay
├── .env                  <-- Vos secrets
├── server.js             <-- Le serveur Express
├── package.json
├── out/                  <-- Dossier statique généré par 'npm run build'
│   ├── index.html
│   ├── dashboard/
│   ├── _next/
│   └── ...
└── node_modules/         <-- Installés via "npm install" sur cPanel
```

## 3. Configuration de l'Application Node.js (cPanel)

- **Application Root** : `public_html/gsi-smartpay`
- **Application URL** : `groupegsi.mg/gsi-smartpay`
- **Application Startup File** : `server.js`
- **Node Version** : 18.x ou 20.x
- **Run JS Install** : Cliquez sur ce bouton pour installer `express`, `dotenv`, `node-fetch`, etc.
- **Restart** : Redémarrez l'application.

## 4. Pourquoi c'est mieux ?

*   **Zéro dépendance Next.js au runtime** : Le serveur cPanel ne fait que servir des fichiers HTML/JS déjà compilés et agit comme un simple proxy API léger.
*   **Sécurité** : Les variables d'environnement sont gérées par Express et ne sont jamais exposées au client.
*   **Stabilité** : Élimine les erreurs 503 liées à la compilation à la volée ou aux modules manquants dans le bundle Next.js complexe.
