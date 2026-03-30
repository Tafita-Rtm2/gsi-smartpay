# Guide de Déploiement cPanel (Mode Standalone) - SPÉCIAL 503

Si vous obtenez une **erreur 503**, c'est que le processus Node.js s'arrête immédiatement après son lancement. Voici comment corriger cela.

## 1. Vérifications IMPÉRATIVES avant le build

1.  **Version de Node.js** : Votre cPanel **DOIT** utiliser **Node.js 18.17.0** ou supérieur. Si c'est en version 14 ou 16, le serveur ne démarrera jamais (503).
2.  **Configuration Next.js** : J'ai mis à jour `next.config.js` avec `unoptimized: true` pour les images. Cela évite d'utiliser la librairie `sharp` qui fait souvent planter les hébergements mutualisés.

## 2. Structure finale sur le serveur

Pour que le site fonctionne dans le dossier `/gsi-smartpay`, organisez vos fichiers exactement ainsi dans votre dossier d'application (ex: `/home/user/nodeapp/`) :

```text
/home/user/nodeapp/ (le dossier configuré dans Setup Node.js App)
├── server.js               <-- (Copié depuis .next/standalone/server.js)
├── package.json            <-- (Copié depuis la racine de votre projet)
├── .env                    <-- (Facultatif si variables saisies dans cPanel)
├── public/                 <-- (Copié depuis la racine de votre projet)
│   └── (contient vos images, logos, etc.)
└── .next/
    ├── static/             <-- (Copié depuis .next/static)
    └── (le reste du build standalone si nécessaire)
```

**ATTENTION** : Le dossier `node_modules` à la racine de votre dossier d'application **doit être celui présent dans `.next/standalone/node_modules`** pour que toutes les dépendances compilées soient présentes.

## 3. Configuration dans l'interface cPanel "Setup Node.js App"

1.  **Application root** : `/home/user/nodeapp`
2.  **Application URL** : `votre-domaine.com/gsi-smartpay`
3.  **Application startup file** : `server.js`
4.  **Environment variables** (CRITIQUE pour éviter le 503) :
    -   `NODE_ENV`: `production`
    -   `GSI_DATABASE_URL`: (votre URL de base de données)
    -   `GSI_ADMIN_PASSWORD`: `Nina GSI`

## 4. Comment voir l'erreur exacte si vous avez encore un 503 ?

cPanel cache souvent les erreurs dans un fichier de log. Regardez dans votre dossier d'application :
1.  Cherchez un fichier nommé `stderr.log` ou `error_log`.
2.  Si le fichier existe, ouvrez-le. Il vous dira exactement pourquoi il crash (ex: "Module not found", "Unexpected token", "Node version mismatch").

**Conseil final** : Après avoir téléchargé et placé vos fichiers, cliquez sur **"RESTART"** dans l'interface cPanel Node.js pour forcer le rechargement.
