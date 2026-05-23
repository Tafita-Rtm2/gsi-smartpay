// GSI Formation - Serveur API Express pour cPanel avec MySQL
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const SESSION_COOKIE = "gsi_formation_session";

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log('--- GSI FORMATION STARTUP ---');
console.log(`[INIT] DB_HOST: ${process.env.DB_HOST ? 'OK' : 'MISSING'}`);
console.log('----------------------------');

// --- MIDDLEWARE AUTH ---
const authenticate = (role) => {
    return (req, res, next) => {
        const session = req.cookies[SESSION_COOKIE];
        if (!session) return res.status(401).json({ error: "Non authentifié" });
        try {
            const user = JSON.parse(session);
            if (role && user.role !== role && user.role !== 'admin') {
                return res.status(403).json({ error: "Accès refusé" });
            }
            req.user = user;
            next();
        } catch (e) {
            return res.status(401).json({ error: "Session invalide" });
        }
    };
};

// --- ROUTES AUTH ---

app.post('/formation/api/auth/login', async (req, res) => {
    const { email, password, filiere_id } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND password = ? AND (filiere_id = ? OR role IN ("admin", "staff"))', [email, password, filiere_id]);
        if (rows.length === 0) return res.status(401).json({ error: "Identifiants incorrects ou filière non correspondante" });

        const user = rows[0];
        const userData = { id: user.id, email: user.email, role: user.role, filiere_id: user.filiere_id, full_name: user.full_name };

        res.cookie(SESSION_COOKIE, JSON.stringify(userData), {
            httpOnly: true, secure: process.env.NODE_ENV === "production",
            sameSite: "lax", maxAge: 60 * 60 * 24 * 1000, path: "/formation/",
        });
        res.json({ ok: true, user: userData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/formation/api/auth/register', async (req, res) => {
    const { full_name, email, password, filiere_id } = req.body;
    try {
        const [result] = await pool.query('INSERT INTO users (full_name, email, password, filiere_id, role) VALUES (?, ?, ?, ?, "student")', [full_name, email, password, filiere_id]);
        res.json({ ok: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/formation/api/auth/prof-login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.GSI_PROF_PASSWORD) {
        const userData = { role: 'staff', full_name: 'Personnel GSI' };
        res.cookie(SESSION_COOKIE, JSON.stringify(userData), {
            httpOnly: true, secure: process.env.NODE_ENV === "production",
            sameSite: "lax", maxAge: 60 * 60 * 24 * 1000, path: "/formation/",
        });
        return res.json({ ok: true });
    }
    res.status(401).json({ error: "Mot de passe incorrect" });
});

app.post('/formation/api/auth/admin-login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.GSI_ADMIN_PASSWORD) {
        const userData = { role: 'admin', full_name: 'Admin Nina' };
        res.cookie(SESSION_COOKIE, JSON.stringify(userData), {
            httpOnly: true, secure: process.env.NODE_ENV === "production",
            sameSite: "lax", maxAge: 60 * 60 * 24 * 1000, path: "/formation/",
        });
        return res.json({ ok: true });
    }
    res.status(401).json({ error: "Mot de passe incorrect" });
});

app.post('/formation/api/auth/logout', (req, res) => {
    res.clearCookie(SESSION_COOKIE, { path: "/formation/" });
    res.json({ ok: true });
});

// --- MODULES & PAYMENTS ---

app.get('/formation/api/modules', authenticate(), async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT m.*, um.unlocked
            FROM modules m
            LEFT JOIN user_modules um ON m.id = um.module_id AND um.user_id = ?
            WHERE m.filiere_id = ?
            ORDER BY m.module_number ASC
        `, [req.user.id, req.user.filiere_id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/formation/api/payments', authenticate('student'), async (req, res) => {
    const { module_id, reference, proof_image, amount } = req.body;
    try {
        await pool.query('INSERT INTO payments (user_id, module_id, reference, proof_image, amount) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, module_id, reference, proof_image, amount]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ADMIN: VALIDATE PAYMENTS ---
app.get('/formation/api/admin/payments', authenticate('admin'), async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT p.*, u.full_name as student_name, m.module_number, f.name as filiere_name
            FROM payments p
            JOIN users u ON p.user_id = u.id
            JOIN modules m ON p.module_id = m.id
            JOIN filieres f ON m.filiere_id = f.id
            WHERE p.status = 'pending'
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/formation/api/admin/payments/:id/approve', authenticate('admin'), async (req, res) => {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [pRows] = await connection.query('SELECT * FROM payments WHERE id = ?', [id]);
        const payment = pRows[0];

        await connection.query('UPDATE payments SET status = "approved" WHERE id = ?', [id]);

        // Unlock module for user
        const [umRows] = await connection.query('SELECT * FROM user_modules WHERE user_id = ? AND module_id = ?', [payment.user_id, payment.module_id]);
        if (umRows.length > 0) {
            await connection.query('UPDATE user_modules SET unlocked = TRUE WHERE id = ?', [umRows[0].id]);
        } else {
            await connection.query('INSERT INTO user_modules (user_id, module_id, unlocked) VALUES (?, ?, TRUE)', [payment.user_id, payment.module_id]);
        }

        await connection.commit();
        res.json({ ok: true });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

// --- STAFF: MANAGE CONTENT ---
app.post('/formation/api/staff/modules', authenticate('staff'), async (req, res) => {
    const { filiere_id, module_number, subject1_name, subject1_pdf, subject2_name, subject2_pdf, price } = req.body;
    try {
        await pool.query('INSERT INTO modules (filiere_id, module_number, subject1_name, subject1_pdf, subject2_name, subject2_pdf, price) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [filiere_id, module_number, subject1_name, subject1_pdf, subject2_name, subject2_pdf, price]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Static files and Next.js handling
const outPath = path.join(__dirname, 'out');
app.use('/formation/', express.static(outPath));
app.get('/formation/*', (req, res) => {
    res.sendFile(path.join(outPath, 'index.html'));
});

app.listen(port, () => { console.log(`> GSI Formation prêt sur le port ${port}`); });
