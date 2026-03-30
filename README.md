# GSI SmartPay 🎓

Plateforme intelligente de gestion des écolages pour l'établissement GSI.

## Fonctionnalités

- 📊 **Tableau de bord** — statistiques, graphiques, taux de recouvrement
- 👥 **Gestion des étudiants** — liste, filtres, statuts de paiement
- 💳 **Gestion des paiements** — enregistrement, modes de paiement (MVola, Orange Money…)
- 📒 **Journal financier** — recettes et dépenses
- 📈 **Rapports** — compte de résultat, impayés, trésorerie
- 🧾 **Reçus** — aperçu et téléchargement PDF
- 📱 **100% Responsive** — mobile, tablette, ordinateur

## Stack technique

- **Framework** : Next.js 14 (App Router)
- **Langage** : TypeScript
- **Styles** : Tailwind CSS
- **Graphiques** : Recharts
- **Icônes** : Lucide React
- **Hébergement** : Render

---

## Installation locale

```bash
# 1. Cloner le dépôt
git clone https://github.com/VOTRE_USER/gsi-smartpay.git
cd gsi-smartpay

# 2. Installer les dépendances
npm install

# 3. Lancer en développement
npm run dev

# 4. Ouvrir dans le navigateur
# http://localhost:3000
```

---

## Déploiement sur GitHub

```bash
git init
git add .
git commit -m "feat: GSI SmartPay initial"
git branch -M main
git remote add origin https://github.com/VOTRE_USER/gsi-smartpay.git
git push -u origin main
```

---

## Déploiement sur Render

1. Allez sur [render.com](https://render.com) → **New Web Service**
2. Connectez votre dépôt GitHub
3. Configurez :
   - **Name** : `gsi-smartpay`
   - **Environment** : `Node`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`
   - **Instance Type** : Free (ou Starter)
4. Cliquez sur **Create Web Service**

> ⚠️ Assurez-vous que `next.config.js` contient `output: 'standalone'` (déjà configuré).

---

## Structure du projet

```
gsi-smartpay/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Page de connexion
│   │   ├── layout.tsx            # Layout racine
│   │   ├── globals.css           # Styles globaux
│   │   ├── dashboard/            # Tableau de bord
│   │   ├── etudiants/            # Gestion étudiants
│   │   ├── paiements/            # Gestion paiements
│   │   ├── journal/              # Journal financier
│   │   ├── rapports/             # Rapports
│   │   └── recus/                # Reçus PDF
│   ├── components/
│   │   ├── Sidebar.tsx           # Navigation responsive
│   │   └── StatusBadge.tsx       # Badge de statut
│   └── lib/
│       └── data.ts               # Données mock + types
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## Rôles utilisateurs

| Rôle | Accès |
|------|-------|
| Admin | Supervision totale |
| Comptable | Paiements + rapports |
| Agent | Encaissement uniquement |

---

## Code couleur statuts

- 🟢 **Vert** → Payé
- 🔴 **Rouge** → Impayé  
- 🟡 **Orange** → En attente

---

*GSI SmartPay — Développé pour l'établissement GSI, Madagascar*
