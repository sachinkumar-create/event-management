const db = require('c:/Users/User/Desktop/Rohit Goyal/anti-test/backend/config/db');

async function migrate() {
    try {
        console.log('Starting detailed migration for speakers table...');
        
        const colsToAdd = [
            { name: 'topic', type: 'TEXT' },
            { name: 'panel', type: 'VARCHAR(255)' },
            { name: 'mobile_no', type: 'VARCHAR(50)' },
            { name: 'linkedin_url', type: 'VARCHAR(255)' }
        ];

        for (const col of colsToAdd) {
            try {
                process.stdout.write(`Adding column ${col.name}... `);
                await db.query(`ALTER TABLE speakers ADD COLUMN ${col.name} ${col.type}`);
                console.log('SUCCESS');
            } catch (e) {
                if (e.code === 'ER_DUP_COLUMN_NAME') {
                    console.log('ALREADY EXISTS');
                } else {
                    console.log('FAILED');
                    console.error('Error details:', e.message);
                }
            }
        }

        console.log('Migration check completed');
        process.exit(0);
    } catch (err) {
        console.error('Migration crashed:', err);
        process.exit(1);
    }
}

migrate();
