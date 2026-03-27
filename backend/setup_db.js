const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const createDatabase = async () => {
    try {
        // Connect without database selected
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });

        console.log('Connected to MySQL server');

        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        console.log(`Database ${process.env.DB_NAME} created or already exists`);

        await connection.end();

        // Connect to the database
        const db = await mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        // Create Tables
        const tables = [
            `CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'manager', 'employee') DEFAULT 'employee',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                start_date DATETIME,
                end_date DATETIME,
                venue VARCHAR(255),
                status ENUM('upcoming', 'ongoing', 'completed', 'canceled') DEFAULT 'upcoming',
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )`,
            `CREATE TABLE IF NOT EXISTS speakers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                bio TEXT,
                photo_url VARCHAR(255),
                designation VARCHAR(255),
                company VARCHAR(255),
                email VARCHAR(255),
                role VARCHAR(255),
                event_id INT,
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
            )`,
            `CREATE TABLE IF NOT EXISTS partner_categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS partners (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                website VARCHAR(255),
                logo_url VARCHAR(255),
                category_id INT,
                event_id INT,
                FOREIGN KEY (category_id) REFERENCES partner_categories(id) ON DELETE SET NULL,
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
            )`,
            `CREATE TABLE IF NOT EXISTS agendas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_id INT NOT NULL,
                day_number INT DEFAULT 1,
                start_time TIME,
                end_time TIME,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS agenda_speakers (
                agenda_id INT,
                speaker_id INT,
                PRIMARY KEY (agenda_id, speaker_id),
                FOREIGN KEY (agenda_id) REFERENCES agendas(id) ON DELETE CASCADE,
                FOREIGN KEY (speaker_id) REFERENCES speakers(id) ON DELETE CASCADE
            )`
        ];

        for (const query of tables) {
            await db.query(query);
        }
        console.log('All tables created successfully');

        // Seed Admin User
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', ['admin@example.com']);
        if (users.length === 0) {
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            await db.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                ['Admin User', 'admin@example.com', hashedPassword, 'admin']);
            console.log('Default Admin User Created: admin@example.com / admin123');
        } else {
            console.log('Admin user already exists');
        }

        process.exit();
    } catch (error) {
        console.error('Error setting up database:', error);
        process.exit(1);
    }
};

createDatabase();
