// GSI SmartPay - Serveur API Express pour cPanel
// Version ultra-robuste avec logs détaillés pour débugger la base de données
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const https = require('https');

// Chargement du .env depuis la racine de l'application
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  require('dotenv').config();
}

const app = express();
const port = process.env.PORT || 3000;
const SESSION_COOKIE = "gsi_secure_session";

// Middleware pour parser le JSON et les cookies
app.use(express.json());
app.use(cookieParser());

// Debugging logs au démarrage pour vérifier les variables
console.log('--- GSI SMARTPAY STARTUP DIAGNOSTICS ---');
console.log(`[INIT] GSI_DATABASE_URL: ${process.env.GSI_DATABASE_URL || 'MISSING'}`);
console.log(`[INIT] GSI_ADMIN_PASSWORD: ${process.env.GSI_ADMIN_PASSWORD ? 'OK (HIDDEN)' : 'MISSING'}`);
console.log(`[INIT] NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`[INIT] PORT: ${port}`);
console.log('---------------------------------------');

// --- ROUTES AUTHENTIFICATION ---

app.post('/gsi-smartpay/api/auth/admin/', (req, res) => {
  const { password } = req.body;
  const adminPwd = process.env.GSI_ADMIN_PASSWORD;
  const cleanAdminPwd = adminPwd ? adminPwd.replace(/^["']|["']$/g, '').trim() : '';

  if (password === cleanAdminPwd) {
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false, error: "Mot de passe incorrect" });
});

app.post('/gsi-smartpay/api/auth/session/', (req, res) => {
  const { user } = req.body;
  if (!user || !user.id) {
    return res.status(400).json({ error: "Invalid user data" });
  }

  res.cookie(SESSION_COOKIE, JSON.stringify({
    userId: user.id,
    role: user.role,
    etablissement: user.etablissement,
    ts: Date.now()
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 1000, // 1 day
    path: "/gsi-smartpay/",
  });

  return res.json({ ok: true });
});

app.post('/gsi-smartpay/api/auth/logout/', (req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: "/gsi-smartpay/" });
  return res.json({ ok: true });
});

app.get('/gsi-smartpay/api/auth/session/', (req, res) => {
  const session = req.cookies[SESSION_COOKIE];
  if (!session) return res.json({ authenticated: false });
  try {
    return res.json({
      authenticated: true,
      user: JSON.parse(session)
    });
  } catch {
    return res.json({ authenticated: false });
  }
});

// --- PROXY API BASE DE DONNÉES (Ultra robuste) ---

app.use('/gsi-smartpay/api/db', async (req, res) => {
  let API_BASE = process.env.GSI_DATABASE_URL;
  if (!API_BASE) {
    console.error("[DB ERROR] GSI_DATABASE_URL is missing in .env");
    return res.status(500).json({ error: "Configuration manquante: GSI_DATABASE_URL" });
  }

  // Nettoyage de l'URL pour éviter les erreurs de concaténation
  API_BASE = API_BASE.trim().replace(/\/+$/, '');
  const pathSuffix = req.url.split('?')[0].replace(/^\/*/, '/');
  const finalUrl = `${API_BASE}${pathSuffix}`;

  // Vérification session
  const sessionStr = req.cookies[SESSION_COOKIE];
  if (!sessionStr) return res.status(401).json({ error: "Session requise" });

  let userSession;
  try {
    userSession = JSON.parse(sessionStr);
  } catch (e) {
    return res.status(401).json({ error: "Session invalide" });
  }

  const { role } = userSession;
  if (req.method === "DELETE" && role !== "admin") {
    return res.status(403).json({ error: "Privilège Admin requis pour supprimer" });
  }

  try {
    // Configuration Axios pour le proxy
    const axiosConfig = {
      method: req.method,
      url: finalUrl,
      params: req.query,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      timeout: 15000,
      validateStatus: () => true, // On accepte tous les status pour les relayer
      httpsAgent: new https.Agent({ rejectUnauthorized: false }) // Supporte les certifs auto-signés
    };

    if (["POST", "PATCH", "PUT"].includes(req.method)) {
      axiosConfig.data = req.body;
    }

    const apiRes = await axios(axiosConfig);
    let data = apiRes.data;

    // Isolation des données par Campus pour les non-admins
    if (req.method === "GET" && role !== "admin") {
      const collection = pathSuffix.split('/')[1];
      const myEtab = userSession.etablissement;

      const belongsToMe = (item) => {
        const campus = (item.campus || "").toLowerCase();
        return campus.includes(myEtab) || campus.includes(myEtab.slice(0, 4));
      };

      if (["users", "ecolage", "paiements"].includes(collection)) {
        let listKey = "";
        for (const key of ["documents", "data", "results", "items", "records", "list"]) {
          if (Array.isArray(data[key])) { listKey = key; break; }
        }
        if (listKey) data[listKey] = data[listKey].filter(belongsToMe);
        else if (Array.isArray(data)) data = data.filter(belongsToMe);
      }
    }

    return res.status(apiRes.status).json(data);
  } catch (error) {
    console.error(`[DB PROXY FAILURE] ${req.method} ${finalUrl} :`, error.message);
    return res.status(500).json({
      error: "Impossible de contacter la base de données",
      details: error.message,
      url: finalUrl
    });
  }
});

// --- FICHIERS STATIQUES (Dossier out/) ---

const outPath = path.join(__dirname, 'out');
app.use('/gsi-smartpay/', express.static(outPath));

// Fallback pour les routes SPA (Tableau de bord, etc.)
app.use('/gsi-smartpay', (req, res, next) => {
  if (!req.url.includes('.')) {
    return res.sendFile(path.join(outPath, 'index.html'));
  }
  next();
});

app.listen(port, () => {
  console.log(`> GSI SmartPay Serveur prêt sur le port ${port}`);
});
