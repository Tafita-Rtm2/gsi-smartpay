-- Database schema for GSI Formation

CREATE TABLE IF NOT EXISTS filieres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('BTS', 'LICENCE') NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    filiere_id INT,
    role ENUM('student', 'staff', 'admin') DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (filiere_id) REFERENCES filieres(id)
);

CREATE TABLE IF NOT EXISTS modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filiere_id INT,
    module_number INT NOT NULL,
    subject1_name VARCHAR(255),
    subject1_pdf VARCHAR(255),
    subject2_name VARCHAR(255),
    subject2_pdf VARCHAR(255),
    price DECIMAL(10, 2) DEFAULT 0.00,
    FOREIGN KEY (filiere_id) REFERENCES filieres(id)
);

CREATE TABLE IF NOT EXISTS user_modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    module_id INT,
    unlocked BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (module_id) REFERENCES modules(id)
);

CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    module_id INT,
    reference VARCHAR(255),
    proof_image VARCHAR(255),
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    amount DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (module_id) REFERENCES modules(id)
);

CREATE TABLE IF NOT EXISTS exams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filiere_id INT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    pdf_url VARCHAR(255),
    start_date DATETIME,
    end_date DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (filiere_id) REFERENCES filieres(id)
);

CREATE TABLE IF NOT EXISTS exam_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_id INT,
    user_id INT,
    file_url VARCHAR(255),
    grade DECIMAL(5, 2),
    feedback TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES exams(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filiere_id INT,
    title VARCHAR(255),
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (filiere_id) REFERENCES filieres(id)
);

CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT,
    receiver_id INT,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- Seed Filières
INSERT INTO filieres (name, type) VALUES
('Tourisme, Voyage & Hôtellerie', 'BTS'),
('Droit & Techniques des Affaires', 'BTS'),
('Bâtiment & Travaux Publics', 'BTS'),
('Informatique de Gestion', 'BTS'),
('Management des Affaires', 'BTS'),
('Multimédia, Communication & Journalisme', 'BTS'),
('Entrepreneur du BTP (EBTP)', 'LICENCE'),
('Marketing digital & Création de Contenus (MDC)', 'LICENCE'),
('Management des Entreprises (MAE)', 'LICENCE'),
('Multimédia, Communication & Journalisme (MCJ)', 'LICENCE'),
('Informatique de Gestion, Électronique et Télécommunication (IGET)', 'LICENCE');
