// GSI SmartPay - Serveur API Express pour cPanel
// Ce serveur gère la sécurité, le proxy API, et sert les fichiers statiques de "out/"
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const SESSION_COOKIE = "gsi_secure_session";

app.use(express.json());
app.use(cookieParser());

// --- ROUTES AUTHENTIFICATION ---

app.post('/gsi-smartpay/api/auth/admin/', (req, res) => {
  const { password } = req.body;
  if (password === process.env.GSI_ADMIN_PASSWORD) {
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
    sameSite: "strict",
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

// --- PROXY API BASE DE DONNÉES (Utilisation de app.use pour éviter les bugs regex) ---

app.use('/gsi-smartpay/api/db', async (req, res) => {
  const API_BASE = process.env.GSI_DATABASE_URL;
  if (!API_BASE) return res.status(500).json({ error: "Missing API_BASE env" });

  // On récupère le reste du chemin (ex: /users)
  const pathSuffix = req.url.split('?')[0]; // Enlève les query params pour construire l'URL de base
  const url = `${API_BASE}${pathSuffix}`;

  // Vérification session
  const sessionStr = req.cookies[SESSION_COOKIE];
  if (!sessionStr) return res.status(401).json({ error: "Login required" });

  let userSession;
  try { userSession = JSON.parse(sessionStr); } catch { return res.status(401).json({ error: "Invalid session" }); }

  const { role } = userSession;
  if (req.method === "DELETE" && role !== "admin") {
    return res.status(403).json({ error: "Admin privilege required" });
  }

  if (!["admin", "comptable", "agent"].includes(role)) {
    return res.status(403).json({ error: "Unauthorized role" });
  }

  try {
    const config = {
      method: req.method,
      url: url,
      params: req.query, // Transmet les paramètres de recherche
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
    };

    if (["POST", "PATCH", "PUT"].includes(req.method)) {
      config.data = req.body;
    }

    const apiRes = await axios(config);
    let data = apiRes.data;

    // Isolation des données pour les non-admins
    if (req.method === "GET" && role !== "admin") {
      const collection = pathSuffix.split('/')[1]; // /users -> users
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
    console.error("Proxy error:", error.message);
    const status = error.response ? error.response.status : 500;
    const errorData = error.response ? error.response.data : { error: "Failed to fetch from upstream" };
    return res.status(status).json(errorData);
  }
});

// --- FICHIERS STATIQUES (Dossier out/) ---

const outPath = path.join(__dirname, 'out');
app.use('/gsi-smartpay/', express.static(outPath));

// Fallback pour les SPA - On utilise un middleware global
app.use('/gsi-smartpay', (req, res, next) => {
  // S'il n'y a pas d'extension de fichier (ex: .js, .css, .png), on sert index.html
  if (!req.url.includes('.')) {
    return res.sendFile(path.join(outPath, 'index.html'));
  }
  next();
});

app.listen(port, () => {
  console.log(`> GSI SmartPay API & Static server running on port ${port}`);
});
