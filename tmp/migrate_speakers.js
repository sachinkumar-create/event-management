const path = require('path');
const db = require('c:/Users/User/Desktop/Rohit Goyal/anti-test/backend/config/db');

async function migrate() {
    try {
        console.log('Starting migration for speakers table...');
        
        // Add topic column
        try {
            await db.query('ALTER TABLE speakers ADD COLUMN topic TEXT');
            console.log('Added topic column');
        } catch (e) { console.log('Topic column might already exist'); }

        // Add panel column
        try {
            await db.query('ALTER TABLE speakers ADD COLUMN panel VARCHAR(255)');
            console.log('Added panel column');
        } catch (e) { console.log('Panel column might already exist'); }

        // Add mobile_no column
        try {
            await db.query('ALTER TABLE speakers ADD COLUMN mobile_no VARCHAR(50)');
            console.log('Added mobile_no column');
        } catch (e) { console.log('Mobile_no column might already exist'); }

        // Add linkedin_url column
        try {
            await db.query('ALTER TABLE speakers ADD COLUMN linkedin_url VARCHAR(255)');
            console.log('Added linkedin_url column');
        } catch (e) { console.log('Linkedin_url column might already exist'); }

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
