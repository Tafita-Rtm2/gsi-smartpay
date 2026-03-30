# Guide de Déploiement cPanel (Mode Standalone) - VERSION INFAILLIBLE

Si votre build GitHub ne semble pas tout copier dans le dossier `standalone`, voici la méthode pour assembler votre dossier de déploiement final et corriger les erreurs de fichiers manquants.

## 1. Assemblage manuel du dossier (La méthode sûre)

Après avoir fait `npm run build`, vous aurez deux dossiers : `.next/` et `.next/standalone/`. Ne copiez pas seulement `standalone`, faites cet assemblage :

1.  Prenez tout le contenu de `.next/standalone/` et copiez-le à la racine de votre application Node.js sur cPanel.
2.  **CRITIQUE** : Prenez le dossier `.next/server/` (situé dans le dossier `.next/` principal) et copiez-le dans le dossier `.next/` de votre application sur le serveur.
3.  Copiez le dossier `public/` (à la racine de votre projet) vers la racine de l'application sur le serveur.
4.  Copiez le dossier `.next/static/` (situé dans le dossier `.next/` principal) vers le dossier `.next/static/` sur le serveur.

### Structure finale sur cPanel :
```text
/public_html/gsi-smartpay/ (Dossier racine sur le serveur)
├── server.js
├── package.json
├── public/                 <-- (Vos images/logos)
├── .env                    <-- (Variables d'environnement)
└── .next/
    ├── server/             <-- (DOIT être copié ici !)
    └── static/             <-- (DOIT être copié ici !)
```

## 2. Configuration cPanel Node.js

1.  **Application root** : Le chemin vers votre dossier ci-dessus.
2.  **Application startup file** : `server.js`
3.  **Environment Variables** (Aide à résoudre le 503) :
    -   `NODE_ENV`: `production`
    -   `PORT`: (Laissez vide)
    -   `HOSTNAME`: `127.0.0.1` (Essayer si le 503 persiste)

## 3. Pourquoi `.next/server/` manque parfois ?

Next.js 14 optimise le build standalone en traçant les dépendances. Si le dossier manque, c'est que le traceur a considéré (souvent à tort sur cPanel) que les fichiers n'étaient pas nécessaires au démarrage direct. En les copiant manuellement, vous forcez le serveur à les trouver.

## 4. Astuce pour GitHub Actions

Si vous utilisez GitHub Actions pour faire le build, vous pouvez ajouter ces lignes à votre workflow pour qu'il crée un ZIP déjà complet :

```yaml
- name: Prepare build for cPanel
  run: |
    cp -r public .next/standalone/public
    cp -r .next/static .next/standalone/.next/static
    cp -r .next/server .next/standalone/.next/server
```
Ensuite, compressez seulement le dossier `.next/standalone/` et téléchargez-le.
