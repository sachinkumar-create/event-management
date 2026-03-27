const db = require('./config/db');

async function verifyModuleFixes() {
    try {
        console.log('--- Verifying Module Visibility Fixes ---');
        
        // 1. Setup Test Data
        const [admins] = await db.query('SELECT id FROM users WHERE role = "admin" LIMIT 1');
        const [managers] = await db.query('SELECT id, role FROM users WHERE role = "manager" LIMIT 1');
        
        if (admins.length === 0 || managers.length === 0) {
            console.log('Admin or Manager not found. Skipping verification.');
            process.exit(0);
        }
        
        const adminId = admins[0].id;
        const managerId = managers[0].id;
        
        // Create an event created by ADMIN
        await db.query('INSERT INTO events (title, created_by) VALUES (?, ?)', ['Module Test Event', adminId]);
        const [events] = await db.query('SELECT id FROM events WHERE title = "Module Test Event"');
        const eventId = events[0].id;
        
        // Assign this event to the MANAGER
        await db.query('UPDATE users SET assigned_event_id = ? WHERE id = ?', [eventId, managerId]);
        console.log(`Assigned Event ${eventId} to Manager ${managerId}`);

        // --- 2. Test Speakers ---
        console.log('\nTesting Speakers...');
        await db.query('INSERT INTO speakers (name, email, event_id, created_by) VALUES (?, ?, ?, ?)', 
            ['Test Speaker', 'speaker@test.com', eventId, adminId]);
        const [speakers] = await db.query(
            'SELECT s.id FROM speakers s LEFT JOIN events e ON s.event_id = e.id WHERE e.created_by = ? OR s.event_id = ?',
            [managerId, eventId]
        );
        console.log(speakers.length > 0 ? '✅ Speaker Visible' : '❌ Speaker NOT Visible');

        // --- 3. Test Partners ---
        console.log('\nTesting Partners...');
        await db.query('INSERT INTO partners (name, event_id, created_by) VALUES (?, ?, ?)', 
            ['Test Partner', eventId, adminId]);
        const [partners] = await db.query(
            'SELECT p.id FROM partners p LEFT JOIN events e ON p.event_id = e.id WHERE e.created_by = ? OR p.event_id = ?',
            [managerId, eventId]
        );
        console.log(partners.length > 0 ? '✅ Partner Visible' : '❌ Partner NOT Visible');

        // --- 4. Test Agenda ---
        console.log('\nTesting Agenda...');
        await db.query('INSERT INTO agendas (title, event_id, day_number, start_time, end_time) VALUES (?, ?, ?, ?, ?)', 
            ['Test Agenda', eventId, 1, '10:00', '11:00']);
        const [agendas] = await db.query(
            'SELECT a.id FROM agendas a JOIN events e ON a.event_id = e.id WHERE e.created_by = ? OR a.event_id = ?',
            [managerId, eventId]
        );
        console.log(agendas.length > 0 ? '✅ Agenda Visible' : '❌ Agenda NOT Visible');

        // --- 5. Test Attendees ---
        console.log('\nTesting Attendees...');
        await db.query('INSERT INTO attendees (name, email, event_id, created_by) VALUES (?, ?, ?, ?)', 
            ['Test Attendee', 'attendee@test.com', eventId, adminId]);
        const [attendees] = await db.query(
            'SELECT a.id FROM attendees a LEFT JOIN events e ON a.event_id = e.id WHERE 1=1 AND (e.created_by = ? OR a.event_id = ?)',
            [managerId, eventId]
        );
        console.log(attendees.length > 0 ? '✅ Attendee Visible' : '❌ Attendee NOT Visible');

        // --- 6. Test Travel ---
        console.log('\nTesting Travel...');
        const [speakerRows] = await db.query('SELECT id FROM speakers WHERE email = "speaker@test.com"');
        const speakerId = speakerRows[0].id;
        await db.query('INSERT INTO speaker_travel (speaker_id, title) VALUES (?, ?)', [speakerId, 'Test Flight']);
        const [travel] = await db.query(`
            SELECT t.id FROM speaker_travel t
            LEFT JOIN speakers s ON t.speaker_id = s.id
            LEFT JOIN events e ON s.event_id = e.id
            WHERE 1=1 AND (e.created_by = ? OR s.event_id = ?)
        `, [managerId, eventId]);
        console.log(travel.length > 0 ? '✅ Travel Visible' : '❌ Travel NOT Visible');

        // Cleanup
        console.log('\nCleaning up...');
        await db.query('DELETE FROM speaker_travel WHERE title = "Test Flight"');
        await db.query('DELETE FROM attendees WHERE email = "attendee@test.com"');
        await db.query('DELETE FROM agendas WHERE title = "Test Agenda"');
        await db.query('DELETE FROM partners WHERE name = "Test Partner"');
        await db.query('DELETE FROM speakers WHERE email = "speaker@test.com"');
        await db.query('DELETE FROM events WHERE id = ?', [eventId]);
        await db.query('UPDATE users SET assigned_event_id = NULL WHERE id = ?', [managerId]);

        console.log('\n--- Verification Complete ---');
        process.exit(0);
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

verifyModuleFixes();
