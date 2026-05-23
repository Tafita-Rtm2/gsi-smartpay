// GSI Formation - Serveur API Express pour cPanel avec MySQL
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const SESSION_COOKIE = "gsi_formation_session";
const SESSION_SECRET = process.env.SESSION_SECRET || 'gsi-default-secret';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser(SESSION_SECRET));

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
        const session = req.signedCookies[SESSION_COOKIE];
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
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND (filiere_id = ? OR role IN ("admin", "staff"))', [email, filiere_id]);
        if (rows.length === 0) return res.status(401).json({ error: "Identifiants incorrects" });

        const user = rows[0];
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: "Identifiants incorrects" });

        const userData = { id: user.id, email: user.email, role: user.role, filiere_id: user.filiere_id, full_name: user.full_name };

        res.cookie(SESSION_COOKIE, JSON.stringify(userData), {
            httpOnly: true,
            signed: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 1000,
            path: "/formation/",
        });
        res.json({ ok: true, user: userData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/formation/api/auth/register', async (req, res) => {
    const { full_name, email, password, filiere_id } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query('INSERT INTO users (full_name, email, password, filiere_id, role) VALUES (?, ?, ?, ?, "student")', [full_name, email, hashedPassword, filiere_id]);
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
            httpOnly: true,
            signed: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 1000,
            path: "/formation/",
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
            httpOnly: true,
            signed: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 1000,
            path: "/formation/",
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

app.post('/formation/api/modules/:id/progression', authenticate('student'), async (req, res) => {
    const { id } = req.params;
    const { progression } = req.body;
    try {
        await pool.query('UPDATE user_modules SET progression = ? WHERE user_id = ? AND module_id = ?', [progression, req.user.id, id]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/formation/api/payments', authenticate('student'), async (req, res) => {
    const { module_id, reference, proof_image, amount } = req.body;
    try {
        // Enforce sequential purchase: check if previous module is unlocked
        const [mRows] = await pool.query('SELECT module_number FROM modules WHERE id = ?', [module_id]);
        if (mRows.length === 0) return res.status(404).json({ error: "Module introuvable" });
        const currentNum = mRows[0].module_number;

        if (currentNum > 1) {
            const [prevRows] = await pool.query(`
                SELECT um.unlocked
                FROM modules m
                JOIN user_modules um ON m.id = um.module_id
                WHERE m.filiere_id = ? AND m.module_number = ? AND um.user_id = ?
            `, [req.user.filiere_id, currentNum - 1, req.user.id]);

            if (prevRows.length === 0 || !prevRows[0].unlocked) {
                return res.status(400).json({ error: "Vous devez acheter le module précédent avant celui-ci." });
            }
        }

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

// --- EXAMS & HOMEWORK ---
app.get('/formation/api/exams', authenticate(), async (req, res) => {
    const { type } = req.query;
    try {
        let query = `
            SELECT e.*, es.grade, es.feedback, es.file_url as submission_url, es.submitted_at
            FROM exams e
            LEFT JOIN exam_submissions es ON e.id = es.exam_id AND es.user_id = ?
            WHERE e.filiere_id = ?
        `;
        const params = [req.user.id, req.user.filiere_id];
        if (type) {
            query += " AND e.type = ?";
            params.push(type);
        }
        query += " ORDER BY e.created_at DESC";
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/formation/api/exams', authenticate('staff'), async (req, res) => {
    const { filiere_id, title, description, pdf_url, start_date, end_date, type } = req.body;
    try {
        await pool.query('INSERT INTO exams (filiere_id, title, description, pdf_url, start_date, end_date, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [filiere_id, title, description, pdf_url, start_date, end_date, type || 'examen']);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/formation/api/exams/:id/submit', authenticate('student'), async (req, res) => {
    const { id } = req.params;
    const { file_url } = req.body;
    try {
        // Check if deadline passed
        const [eRows] = await pool.query('SELECT end_date FROM exams WHERE id = ?', [id]);
        if (eRows[0].end_date && new Date() > new Date(eRows[0].end_date)) {
            return res.status(400).json({ error: "Le délai pour cet examen est passé." });
        }

        await pool.query('INSERT INTO exam_submissions (exam_id, user_id, file_url) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE file_url = ?, submitted_at = CURRENT_TIMESTAMP',
            [id, req.user.id, file_url, file_url]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ANNOUNCEMENTS ---
app.get('/formation/api/announcements', authenticate(), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM announcements WHERE filiere_id = ? OR filiere_id IS NULL ORDER BY created_at DESC', [req.user.filiere_id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/formation/api/announcements', authenticate('staff'), async (req, res) => {
    const { filiere_ids, title, content } = req.body; // filiere_ids is an array
    try {
        for (const f_id of filiere_ids) {
            await pool.query('INSERT INTO announcements (filiere_id, title, content) VALUES (?, ?, ?)', [f_id, title, content]);
        }
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- MESSAGING (SUPPORT) ---
app.get('/formation/api/messages', authenticate(), async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT m.*, u.full_name as sender_name
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.sender_id = ? OR m.receiver_id = ?
            ORDER BY m.created_at ASC
        `, [req.user.id, req.user.id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/formation/api/messages', authenticate(), async (req, res) => {
    const { receiver_id, message } = req.body;
    try {
        await pool.query('INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
            [req.user.id, receiver_id || 1, message]); // Default receiver is admin (ID 1) if not specified
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- STAFF: VIEW SUBMISSIONS ---
app.get('/formation/api/staff/submissions', authenticate('staff'), async (req, res) => {
    const { type } = req.query;
    try {
        let query = `
            SELECT es.*, u.full_name as student_name, e.title as exam_title, f.name as filiere_name, e.type
            FROM exam_submissions es
            JOIN users u ON es.user_id = u.id
            JOIN exams e ON es.exam_id = e.id
            JOIN filieres f ON e.filiere_id = f.id
            WHERE es.grade IS NULL
        `;
        const params = [];
        if (type) {
            query += " AND e.type = ?";
            params.push(type);
        }
        query += " ORDER BY es.submitted_at ASC";
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/formation/api/staff/submissions/:id/grade', authenticate('staff'), async (req, res) => {
    const { id } = req.params;
    const { grade, feedback } = req.body;
    try {
        await pool.query('UPDATE exam_submissions SET grade = ?, feedback = ? WHERE id = ?', [grade, feedback, id]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- STAFF: STUDENT LIST ---
app.get('/formation/api/staff/students', authenticate('staff'), async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT u.id, u.full_name, u.email, f.name as filiere_name, u.created_at
            FROM users u
            LEFT JOIN filieres f ON u.filiere_id = f.id
            WHERE u.role = 'student'
            ORDER BY u.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- SECURE FILE SERVING ---
app.get('/formation/api/files/:filename', authenticate(), async (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Fichier introuvable" });
    }

    // Security logic: check if the user is allowed to see this file
    // If it's a module PDF, check unlock status
    try {
        const [mRows] = await pool.query('SELECT id FROM modules WHERE subject1_pdf = ? OR subject2_pdf = ?', [filename, filename]);
        if (mRows.length > 0) {
            const moduleId = mRows[0].id;
            const [umRows] = await pool.query('SELECT unlocked FROM user_modules WHERE user_id = ? AND module_id = ?', [req.user.id, moduleId]);
            if (req.user.role !== 'admin' && req.user.role !== 'staff' && (umRows.length === 0 || !umRows[0].unlocked)) {
                return res.status(403).json({ error: "Accès refusé. Vous devez acheter ce module." });
            }
        }
        // If it's an exam PDF, students in that filiere can see it
        // (Simplified for now, further checks could be added)

        res.sendFile(filePath);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- STAFF: UPLOAD (Helper) ---
app.post('/formation/api/staff/upload', authenticate('staff'), async (req, res) => {
    const { filename, base64Data } = req.body;
    try {
        const buffer = Buffer.from(base64Data.split(',')[1], 'base64');
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

        fs.writeFileSync(path.join(uploadDir, filename), buffer);
        res.json({ ok: true, url: `/formation/api/files/${filename}` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Static files and Next.js handling
const outPath = path.join(__dirname, 'out');
app.use('/formation/', express.static(outPath));
app.get('/formation/*', (req, res) => {
    res.sendFile(path.join(outPath, 'index.html'));
});

app.listen(port, () => { console.log(`> GSI Formation prêt sur le port ${port}`); });
