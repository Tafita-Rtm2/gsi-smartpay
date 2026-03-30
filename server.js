// GSI SmartPay - Serveur API Express pour cPanel
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const https = require('https');

// Chargement du .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  require('dotenv').config();
}

const app = express();
const port = process.env.PORT || 3000;
const SESSION_COOKIE = "gsi_secure_session";

app.use(express.json());
app.use(cookieParser());

// Debugging logs au démarrage
console.log('--- GSI SMARTPAY STARTUP ---');
console.log(`[INIT] GSI_DATABASE_URL: ${process.env.GSI_DATABASE_URL || 'MISSING'}`);
console.log(`[INIT] GSI_ADMIN_PASSWORD: ${process.env.GSI_ADMIN_PASSWORD ? 'OK' : 'MISSING'}`);
console.log('----------------------------');

// --- ROUTES AUTHENTIFICATION ---

// 1. Authentification Staff (Comptable / Agent) depuis la DB
app.post('/gsi-smartpay/api/auth/login/', async (req, res) => {
  const { username, password, etablissement } = req.body;
  const API_BASE = process.env.GSI_DATABASE_URL;
  if (!API_BASE) return res.status(500).json({ error: "API_BASE missing" });

  try {
    // On cherche l'utilisateur dans la collection "staff" (ou "users" selon votre structure)
    // Ici on suppose que "users" contient tout le monde.
    const url = `${API_BASE.replace(/\/+$/, '')}/users`;
    const apiRes = await axios.get(url, {
      headers: { "Accept": "application/json" },
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });

    const allUsers = Array.isArray(apiRes.data) ? apiRes.data : (apiRes.data.documents || apiRes.data.data || []);

    // On cherche l'utilisateur qui correspond
    const user = allUsers.find(u =>
      u.username === username &&
      u.password === password &&
      u.actif !== false &&
      (u.role === 'admin' || (u.etablissement || u.campus || "").toLowerCase().includes(etablissement.toLowerCase()))
    );

    if (!user) {
      return res.status(401).json({ ok: false, error: "Identifiant, mot de passe ou campus incorrect" });
    }

    // Création de la session
    const userData = {
      id: user.id || user._id,
      role: user.role || 'agent',
      etablissement: user.etablissement || user.campus || etablissement,
      nom: user.nom,
      prenom: user.prenom
    };

    res.cookie(SESSION_COOKIE, JSON.stringify({
      ...userData,
      ts: Date.now()
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 1000,
      path: "/gsi-smartpay/",
    });

    return res.json({ ok: true, user: userData });
  } catch (error) {
    console.error("[LOGIN ERROR]", error.message);
    return res.status(500).json({ error: "Erreur de connexion à la base de données" });
  }
});

// 2. Accès Admin Panel (Mot de passe direct configuré dans le .env)
app.post('/gsi-smartpay/api/auth/admin/', (req, res) => {
  const { password } = req.body;
  const adminPwd = (process.env.GSI_ADMIN_PASSWORD || "").replace(/^["']|["']$/g, '').trim();
  if (password === adminPwd) {
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false, error: "Mot de passe incorrect" });
});

// 3. Création de session explicite (pour admin panel)
app.post('/gsi-smartpay/api/auth/session/', (req, res) => {
  const { user } = req.body;
  if (!user) return res.status(400).json({ error: "User required" });

  res.cookie(SESSION_COOKIE, JSON.stringify({
    ...user,
    ts: Date.now()
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 1000,
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
    return res.json({ authenticated: true, user: JSON.parse(session) });
  } catch {
    return res.json({ authenticated: false });
  }
});

// --- PROXY API BASE DE DONNÉES ---

app.use('/gsi-smartpay/api/db', async (req, res) => {
  let API_BASE = process.env.GSI_DATABASE_URL;
  if (!API_BASE) return res.status(500).json({ error: "Missing GSI_DATABASE_URL" });

  API_BASE = API_BASE.trim().replace(/\/+$/, '');
  const pathSuffix = req.url.split('?')[0].replace(/^\/*/, '/');
  const finalUrl = `${API_BASE}${pathSuffix}`;

  const sessionStr = req.cookies[SESSION_COOKIE];
  if (!sessionStr) return res.status(401).json({ error: "Login required" });

  let userSession;
  try { userSession = JSON.parse(sessionStr); } catch (e) { return res.status(401).json({ error: "Invalid session" }); }

  const { role } = userSession;
  // Seul l'admin peut supprimer
  if (req.method === "DELETE" && role !== "admin") {
    return res.status(403).json({ error: "Privilège Admin requis" });
  }

  try {
    const config = {
      method: req.method,
      url: finalUrl,
      params: req.query,
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      timeout: 15000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    };

    if (["POST", "PATCH", "PUT"].includes(req.method)) {
      config.data = req.body;
    }

    const apiRes = await axios(config);
    let data = apiRes.data;

    // Isolation par Campus pour les non-admins (GET)
    if (req.method === "GET" && role !== "admin") {
      const collection = pathSuffix.split('/')[1];
      const myEtab = (userSession.etablissement || "").toLowerCase();

      const belongsToMe = (item) => {
        const campus = (item.campus || item.etablissement || "").toLowerCase();
        return campus.includes(myEtab) || campus.includes(myEtab.slice(0, 4));
      };

      if (["users", "ecolage", "paiements", "expenses", "fees"].includes(collection)) {
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
    const status = error.response ? error.response.status : 500;
    return res.status(status).json(error.response ? error.response.data : { error: error.message });
  }
});

// --- FICHIERS STATIQUES ---

const outPath = path.join(__dirname, 'out');
app.use('/gsi-smartpay/', express.static(outPath));

app.use('/gsi-smartpay', (req, res, next) => {
  if (!req.url.includes('.')) {
    return res.sendFile(path.join(outPath, 'index.html'));
  }
  next();
});

app.listen(port, () => {
  console.log(`> GSI SmartPay prêt sur le port ${port}`);
});
