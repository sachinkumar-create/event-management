const mysql = require('mysql2/promise');

async function migrate() {
    const config = {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'event_gravity'
    };

    let connection;
    try {
        console.log('Starting standalone migration (v4) for speakers table...');
        connection = await mysql.createConnection(config);
        
        const colsToAdd = [
            { name: 'topic', type: 'TEXT' },
            { name: 'panel', type: 'VARCHAR(255)' },
            { name: 'mobile_no', type: 'VARCHAR(50)' },
            { name: 'linkedin_url', type: 'VARCHAR(255)' }
        ];

        for (const col of colsToAdd) {
            try {
                process.stdout.write(`Adding column ${col.name}... `);
                await connection.query(`ALTER TABLE speakers ADD COLUMN ${col.name} ${col.type}`);
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
        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('Migration crashed:', err);
        if (connection) await connection.end();
        process.exit(1);
    }
}

migrate();
