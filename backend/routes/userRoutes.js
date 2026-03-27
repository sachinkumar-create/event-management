const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');

router.get('/', protect, async (req, res) => {
    try {
        let userSelect = `
            u.id, u.name, u.email, u.role, u.assigned_event_id, u.assigned_task, u.created_at,
            'accepted' as status,
            (SELECT COUNT(*) FROM speakers WHERE created_by = u.id) as speaker_count,
            (SELECT COUNT(*) FROM partners WHERE created_by = u.id) as partner_count,
            (SELECT COUNT(*) FROM attendees WHERE created_by = u.id) as attendee_count
        `;
        let userQuery = `SELECT ${userSelect} FROM users u`;
        let inviteQuery = `SELECT 0 as id, '' as name, email, role, event_id as assigned_event_id, assigned_task, created_at, 'pending' as status, 0 as speaker_count, 0 as partner_count, 0 as attendee_count FROM invitations`;
        let params = [];

        if (req.user.role === 'admin') {
            const [users] = await db.query(userQuery);
            const [invites] = await db.query(inviteQuery);
            return res.json([...users, ...invites]);
        } else if (req.user.role === 'manager') {
            // Managers see employees assigned to events they created OR events they are assigned to
            userQuery += ` 
                LEFT JOIN events e ON u.assigned_event_id = e.id 
                WHERE (e.created_by = ? OR u.assigned_event_id = ?) 
                AND u.role = 'employee'
            `;
            inviteQuery += ` WHERE (created_by = ? OR event_id = ?) AND role = 'employee'`;
            params = [req.user.id, req.user.assigned_event_id, req.user.id, req.user.assigned_event_id];
            const [users] = await db.query(userQuery, params);
            const [invites] = await db.query(inviteQuery, [req.user.id, req.user.assigned_event_id]);
            return res.json([...users, ...invites]);
        }
        res.status(403).json({ error: 'Access denied' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', protect, async (req, res) => {
    const { name, email, role, event_id, assigned_task, password } = req.body;
    try {
        if (req.user.role === 'employee') return res.status(403).json({ error: 'Access denied' });
        
        // Admins can do anything
        let query = 'UPDATE users SET name=?, email=?, role=?, assigned_event_id=?, assigned_task=?';
        let params = [name, email, role, event_id || null, assigned_task || null];

        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            query += ', password=?';
            params.push(hashedPassword);
        }

        query += ' WHERE id=?';
        params.push(req.params.id);

        if (req.user.role === 'manager') {
            const [evts] = await db.query('SELECT id FROM events WHERE created_by = ?', [req.user.id]);
            const validEventIds = evts.map(e => Number(e.id));
            if (req.user.assigned_event_id) validEventIds.push(Number(req.user.assigned_event_id));
            
            const [cur] = await db.query('SELECT assigned_event_id FROM users WHERE id=?', [req.params.id]);
            if (cur.length === 0) return res.status(404).json({ error: 'User not found' });
            
            const currentEventId = cur[0].assigned_event_id;
            // Allow if current event is null (unassigned) and manager wants to claim them, or if event matches
            if (currentEventId && !validEventIds.includes(Number(currentEventId))) {
                return res.status(403).json({ error: 'You can only edit your team members' });
            }
            if (event_id && !validEventIds.includes(Number(event_id))) {
                return res.status(403).json({ error: 'Invalid event assignment' });
            }
        }

        await db.query(query, params);
        res.json({ message: 'User updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', protect, async (req, res) => {
    try {
        if (req.user.role === 'employee') return res.status(403).json({ error: 'Access denied' });

        if (req.user.role === 'manager') {
            const [evts] = await db.query('SELECT id FROM events WHERE created_by = ?', [req.user.id]);
            const validEventIds = evts.map(e => Number(e.id));
            
            const [cur] = await db.query('SELECT assigned_event_id FROM users WHERE id=?', [req.params.id]);
            if (cur.length === 0) return res.status(404).json({ error: 'User not found' });
            if (!validEventIds.includes(Number(cur[0].assigned_event_id))) {
                return res.status(403).json({ error: 'You can only delete your team members' });
            }
        }

        await db.query('DELETE FROM users WHERE id=?', [req.params.id]);
        res.json({ message: 'User deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
