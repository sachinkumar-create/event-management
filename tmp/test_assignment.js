const db = require('../backend/config/db');

async function testAssignment() {
    try {
        console.log('--- Testing Event Assignment ---');
        
        // 1. Find a manager or employee user
        const [users] = await db.query('SELECT * FROM users WHERE role IN ("manager", "employee") LIMIT 1');
        if (users.length === 0) {
            console.log('No manager or employee found to test with.');
            return;
        }
        const user = users[0];
        console.log(`Found user: ${user.name} (${user.role}) with ID: ${user.id}`);
        console.log(`Current assigned_event_id: ${user.assigned_event_id}`);

        // 2. Find an event
        const [events] = await db.query('SELECT id, title FROM events LIMIT 1');
        if (events.length === 0) {
            console.log('No events found to assign.');
            return;
        }
        const event = events[0];
        console.log(`Found event: ${event.title} with ID: ${event.id}`);

        // 3. Attempt to assign event (Simulating Admin update)
        console.log(`Assigning event ${event.id} to user ${user.id}...`);
        const query = 'UPDATE users SET assigned_event_id = ? WHERE id = ?';
        await db.query(query, [event.id, user.id]);

        // 4. Verify
        const [updatedUsers] = await db.query('SELECT assigned_event_id FROM users WHERE id = ?', [user.id]);
        console.log(`Updated assigned_event_id: ${updatedUsers[0].assigned_event_id}`);

        if (updatedUsers[0].assigned_event_id === event.id) {
            console.log('✅ Assignment successful in DB.');
        } else {
            console.error('❌ Assignment failed in DB!');
        }

        // 5. Test empty assignment
        console.log('Testing unassignment...');
        await db.query(query, [null, user.id]);
        const [unassignedUsers] = await db.query('SELECT assigned_event_id FROM users WHERE id = ?', [user.id]);
        console.log(`Unassigned assigned_event_id: ${unassignedUsers[0].assigned_event_id}`);

        process.exit(0);
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    }
}

testAssignment();
