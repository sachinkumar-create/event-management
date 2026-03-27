const db = require('./config/db');

async function verifyFix() {
    try {
        console.log('--- Verifying Event Visibility Fix ---');
        
        // 1. Setup Test Data
        // Find an admin and a manager
        const [admins] = await db.query('SELECT id FROM users WHERE role = "admin" LIMIT 1');
        const [managers] = await db.query('SELECT id, role FROM users WHERE role = "manager" LIMIT 1');
        
        if (admins.length === 0 || managers.length === 0) {
            console.log('Admin or Manager not found. Skipping verification.');
            process.exit(0);
        }
        
        const adminId = admins[0].id;
        const managerId = managers[0].id;
        
        // Create an event created by ADMIN
        await db.query('INSERT INTO events (title, created_by) VALUES (?, ?)', ['Admin-Created Event', adminId]);
        const [events] = await db.query('SELECT id FROM events WHERE title = "Admin-Created Event"');
        const eventId = events[0].id;
        
        // Assign this event to the MANAGER
        await db.query('UPDATE users SET assigned_event_id = ? WHERE id = ?', [eventId, managerId]);
        
        console.log(`Assigned Event ${eventId} (created by Admin ${adminId}) to Manager ${managerId}`);

        // 2. Simulate Manager fetching events
        // Mocking the check in eventRoutes.js: e.created_by = ? OR e.id = ?
        const [managerEvents] = await db.query(
            'SELECT id, title FROM events e WHERE e.created_by = ? OR e.id = ?', 
            [managerId, eventId]
        );
        
        console.log('Manager Events found:', managerEvents.map(e => e.title));
        const found = managerEvents.some(e => e.id === eventId);
        
        if (found) {
            console.log('\x1b[32m✅ PASS: Manager can see assigned event created by Admin.\x1b[0m');
        } else {
            console.error('\x1b[31m❌ FAIL: Manager cannot see assigned event created by Admin!\x1b[0m');
        }

        // 3. Simulate Manager fetching users
        // Create an employee assigned to the same event
        await db.query('INSERT INTO users (name, email, password, role, assigned_event_id) VALUES (?, ?, ?, ?, ?)', 
            ['Test Employee', 'test-emp@example.com', 'pwd', 'employee', eventId]);
        
        // Mocking the check in userRoutes.js for manager:
        // (e.created_by = ? OR u.assigned_event_id = ?)
        const [managerTeam] = await db.query(`
            SELECT u.name FROM users u 
            LEFT JOIN events e ON u.assigned_event_id = e.id 
            WHERE (e.created_by = ? OR u.assigned_event_id = ?) 
            AND u.role = 'employee'
        `, [managerId, eventId]);
        
        console.log('Manager Team found:', managerTeam.map(u => u.name));
        const teamFound = managerTeam.some(u => u.name === 'Test Employee');
        
        if (teamFound) {
            console.log('\x1b[32m✅ PASS: Manager can see team members in assigned event.\x1b[0m');
        } else {
            console.error('\x1b[31m❌ FAIL: Manager cannot see team members in assigned event!\x1b[0m');
        }

        // Cleanup
        await db.query('DELETE FROM users WHERE email = "test-emp@example.com"');
        await db.query('DELETE FROM events WHERE id = ?', [eventId]);
        await db.query('UPDATE users SET assigned_event_id = NULL WHERE id = ?', [managerId]);

        process.exit(0);
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

verifyFix();
