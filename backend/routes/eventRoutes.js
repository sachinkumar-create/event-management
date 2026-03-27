const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

// Get Events
router.get('/', protect, async (req, res) => {
    try {
        let selectList = `e.*, u.name as creator_name, (SELECT COUNT(*) FROM speakers WHERE event_id = e.id) as speaker_count`;
        let query = `SELECT ${selectList} FROM events e LEFT JOIN users u ON e.created_by = u.id`;
        let params = [];

        if (req.user.role === 'manager') {
            query += ` WHERE e.created_by = ? OR e.id = ?`;
            params.push(req.user.id, req.user.assigned_event_id);
        } else if (req.user.role === 'employee') {
            const eventId = req.user.assigned_event_id;
            if (!eventId) {
                return res.json([]);
            }
            query += ` WHERE e.id = ?`;
            params.push(eventId);
        }

        query += ` ORDER BY e.start_date ASC`;

        console.log('Event Fetch Debug - User:', req.user.name, 'Role:', req.user.role);
        console.log('Event Fetch Debug - Query Params:', params);

        const [events] = await db.query(query, params);
        res.json(events);
    } catch (err) {
        console.error('Event Fetch Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create Event — Admin & Manager only
router.post('/', protect, async (req, res) => {
    if (req.user.role === 'employee') return res.status(403).json({ error: 'Employees cannot create events' });
    const { title, description, start_date, end_date, venue, status } = req.body;
    try {
        await db.query('INSERT INTO events (title, description, start_date, end_date, venue, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [title, description, start_date, end_date, venue, status || 'upcoming', req.user.id]);
        res.status(201).json({ message: 'Event created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Event — Admin & Manager only (manager: own events)
router.put('/:id', protect, async (req, res) => {
    if (req.user.role === 'employee') return res.status(403).json({ error: 'Employees cannot edit events' });
    const { title, description, start_date, end_date, venue, status } = req.body;
    try {
        if (req.user.role === 'manager') {
            const [evts] = await db.query('SELECT created_by FROM events WHERE id=?', [req.params.id]);
            if (evts.length === 0 || evts[0].created_by !== req.user.id) {
                return res.status(403).json({ error: 'You can only edit events you created' });
            }
        }
        await db.query('UPDATE events SET title=?, description=?, start_date=?, end_date=?, venue=?, status=? WHERE id=?',
            [title, description, start_date, end_date, venue, status, req.params.id]);
        res.json({ message: 'Event updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Event — Admin only
router.delete('/:id', protect, async (req, res) => {
    if (req.user.role === 'employee') return res.status(403).json({ error: 'Employees cannot delete events' });
    try {
        if (req.user.role === 'manager') {
            const [evts] = await db.query('SELECT created_by FROM events WHERE id=?', [req.params.id]);
            if (evts.length === 0 || evts[0].created_by !== req.user.id) {
                return res.status(403).json({ error: 'You can only delete events you created' });
            }
        }
        await db.query('DELETE FROM events WHERE id=?', [req.params.id]);
        res.json({ message: 'Event deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
