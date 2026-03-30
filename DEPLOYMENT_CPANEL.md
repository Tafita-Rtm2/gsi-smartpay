# Guide de Déploiement Statique + API Express (GSI SmartPay)

Cette méthode est la plus robuste pour cPanel car elle sépare le frontend statique du backend API, évitant ainsi les erreurs `Module not found` de Next.js.

## 1. Préparation Locale

1.  Assurez-vous que `next.config.js` contient `output: 'export'`.
2.  Générez le build statique : `npm run build`
3.  Cela va créer un dossier nommé `out/` à la racine de votre projet.

## 2. Structure des fichiers sur cPanel

Placez les fichiers comme suit dans votre dossier racine cPanel :

1.  **out/** : Copiez tout le contenu de votre dossier `out/` local.
2.  **server.js** : Copiez le fichier `server.js` (Express).
3.  **package.json** : Copiez le fichier `package.json`.
4.  **.env** : Créez ce fichier avec :
    ```env
    GSI_DATABASE_URL=https://groupegsi.mg/rtmggmg/api/db
    GSI_ADMIN_PASSWORD="Nina GSI"
    NODE_ENV=production
    PORT=3000
    ```

## 3. Configuration de l'Application Node.js (cPanel)

- **Application Root** : le chemin de votre dossier (ex: `public_html/gsi-smartpay`).
- **Application URL** : `groupegsi.mg/gsi-smartpay`
- **Application Startup File** : `server.js`
- **Node Version** : 18.x ou 20.x
- **Run JS Install** : Cliquez sur ce bouton pour installer `axios`, `express`, `dotenv`, etc.
- **Restart** : Redémarrez l'application.

## 4. Collections de la Base de Données

Le système utilise désormais les collections suivantes dans votre API :
- `users` : Contient les étudiants.
- `staff` : Contient les comptes des agents et comptables (créés par l'admin).
- `ecolage` : Suivi des écolages.
- `paiements` : Historique des transactions.
- `expenses` : Journal des dépenses.
- `fees` : Configuration des tarifs par filière.

## 5. Résolution des problèmes

*   **Comptes non visibles** : Assurez-vous que la collection `staff` existe dans votre base de données.
*   **Suppression impossible** : Seul le compte administrateur peut supprimer des données. Vérifiez que vous êtes bien sur le panneau Admin.
*   **503 Service Unavailable** : Vérifiez les logs Node.js dans cPanel. Si `axios` est manquant, refaites "Run JS Install".
