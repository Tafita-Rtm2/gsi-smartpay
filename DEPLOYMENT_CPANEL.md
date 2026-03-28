# Guide de Déploiement cPanel pour GSI SmartPay

Ce guide vous explique comment déployer l'application GSI SmartPay sur votre serveur cPanel dans le dossier `/home/groupegs/domains/groupesgi.mg/gsi-smartpay` afin qu'elle soit accessible via l'URL `groupegsi.mg/gsi-smartpay`.

## 1. Préparation du code pour la production

Avant d'envoyer les fichiers sur cPanel, assurez-vous que la configuration est prête :

1.  **Vérification du `next.config.js`** :
    Le fichier doit contenir `basePath: '/gsi-smartpay'` (ce que j'ai déjà configuré pour vous). Cela permet à Next.js de savoir que le site ne tourne pas à la racine du domaine.
2.  **Génération du Build** :
    Dans votre terminal local (sur votre ordinateur), lancez la commande :
    ```bash
    npm run build
    ```
    Cela va créer un dossier `.next` optimisé pour la production.

## 2. Configuration sur cPanel

### Étape A : Créer l'application Node.js
1.  Connectez-vous à votre interface **cPanel**.
2.  Cherchez l'outil **"Setup Node.js App"** (souvent dans la section Logiciels/Software).
3.  Cliquez sur **"Create Application"**.
4.  Remplissez les champs comme suit :
    *   **Node.js version** : Sélectionnez une version récente (ex: 18.x ou 20.x).
    *   **Application mode** : Production.
    *   **Application root** : `domains/groupesgi.mg/gsi-smartpay`.
    *   **Application URL** : `groupesgi.mg/gsi-smartpay`.
    *   **Application startup file** : `server.js`.
5.  Cliquez sur **"Create"**.

### Étape B : Variables d'environnement (.env)
Dans la même interface "Node.js App" :
1.  Allez dans la section **"Environment variables"**.
2.  Ajoutez les variables suivantes (très important pour la sécurité) :
    *   `GSI_DATABASE_URL` = `https://groupegsi.mg/rtmggmg/api/db`
    *   `GSI_ADMIN_PASSWORD` = `Nina GSI`
    *   `NODE_ENV` = `production`
3.  Cliquez sur **"Save"**.

## 3. Transfert des fichiers

Utilisez le **Gestionnaire de fichiers** cPanel ou un client **FTP** (comme FileZilla) pour envoyer les fichiers suivants dans `/home/groupegs/domains/groupesgi.mg/gsi-smartpay` :

1.  Le dossier `.next`
2.  Le dossier `public`
3.  Le fichier `package.json`
4.  Le fichier `next.config.js`
5.  **TRÈS IMPORTANT** : Copiez le fichier `server.js` qui se trouve à l'intérieur du dossier `.next/standalone/server.js` vers la racine de votre application (`/gsi-smartpay/server.js`).
6.  Copiez également tout le contenu de `.next/static` vers `.next/standalone/.next/static`.

## 4. Installation des dépendances

1.  Retournez dans **"Setup Node.js App"** sur cPanel.
2.  Cliquez sur le bouton **"Run JS Install"** (ou "npm install"). Cela va installer tous les modules nécessaires sur le serveur.
3.  Une fois terminé, cliquez sur **"Restart"** pour lancer l'application.

## 5. Résolution des problèmes courants

*   **Erreur 404 sur les images/CSS** : Vérifiez que `assetPrefix` est bien présent dans `next.config.js`.
*   **Site qui ne démarre pas** : Consultez les "Logs" dans l'interface Node.js App de cPanel.
*   **Problème de droits** : Assurez-vous que le dossier `gsi-smartpay` a les permissions correctes (généralement 755).

Votre application devrait maintenant être accessible en toute sécurité sur `groupegsi.mg/gsi-smartpay` !
