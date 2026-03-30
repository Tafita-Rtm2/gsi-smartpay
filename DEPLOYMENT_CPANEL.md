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
├── server.js             <-- Le serveur Express (Mis à jour pour être compatible avec toutes les versions)
├── package.json
├── out/                  <-- Dossier statique généré par 'npm run build'
└── node_modules/         <-- Installés via "npm install" sur cPanel
```

## 3. Configuration de l'Application Node.js (cPanel)

- **Application Root** : `public_html/gsi-smartpay`
- **Application URL** : `groupegsi.mg/gsi-smartpay`
- **Application Startup File** : `server.js`
- **Node Version** : 18.x ou 20.x
- **Run JS Install (IMPORTANT)** : Cliquez sur ce bouton dans cPanel pour installer `axios`, `express`, `dotenv`, etc. **Sans cette étape, vous aurez une erreur "Cannot find module 'axios'".**
- **Restart** : Redémarrez l'application après l'installation.

## 4. Résolution des problèmes (Logs cPanel)

*   **Error: Cannot find module 'axios'** : Vous avez oublié de cliquer sur "Run JS Install" dans l'interface Node.js de cPanel.
*   **PathError [TypeError]** : Résolu dans cette version de `server.js` en évitant les expressions régulières complexes (utilisation de `app.use` à la place).
*   **503 Service Unavailable** :
    1.  Vérifiez que vous avez cliqué sur "Run JS Install".
    2.  Vérifiez que toutes les variables sont dans le fichier `.env` à la racine.
    3.  Vérifiez les logs pour voir s'il y a une erreur sur une ligne spécifique.
