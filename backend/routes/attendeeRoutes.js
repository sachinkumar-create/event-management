const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

// Helper: check if employee is allowed for given event_id
const employeeAllowed = (req, event_id) => {
    if (req.user.role !== 'employee') return true;
    return String(req.user.assigned_event_id) === String(event_id);
};

// GET all attendees (optional ?event_id= filter)
router.get('/', protect, async (req, res) => {
    try {
        let query = `
            SELECT a.*, e.title as event_title 
            FROM attendees a 
            LEFT JOIN events e ON a.event_id = e.id
            WHERE 1=1
        `;
        const params = [];
        
        if (req.user.role === 'manager') {
            query += ' AND (e.created_by = ? OR a.event_id = ?)';
            params.push(req.user.id, req.user.assigned_event_id);
        } else if (req.user.role === 'employee') {
            if (!req.user.assigned_event_id) return res.json([]);
            query += ' AND a.event_id = ?';
            params.push(req.user.assigned_event_id);
        }

        if (req.query.event_id) {
            query += ' AND a.event_id = ?';
            params.push(req.query.event_id);
        }
        query += ' ORDER BY a.created_at DESC';
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET attendee stats summary
router.get('/stats/summary', protect, async (req, res) => {
    try {
        let joinClause = '';
        let whereClause = '';
        let params = [];
        
        if (req.user.role === 'manager') {
            joinClause = 'JOIN events e ON a.event_id = e.id';
            whereClause = 'WHERE (e.created_by = ? OR a.event_id = ?)';
            params.push(req.user.id, req.user.assigned_event_id);
        } else if (req.user.role === 'employee') {
            if (!req.user.assigned_event_id) return res.json({ total: 0, byStatus: [], byTicketType: [] });
            whereClause = 'WHERE a.event_id = ?';
            params.push(req.user.assigned_event_id);
        }

        const [statusStats] = await db.query(`
            SELECT a.status, COUNT(a.id) as count FROM attendees a ${joinClause} ${whereClause} GROUP BY a.status
        `, params);
        const [ticketStats] = await db.query(`
            SELECT a.ticket_type, COUNT(a.id) as count FROM attendees a ${joinClause} ${whereClause} GROUP BY a.ticket_type
        `, params);
        const [total] = await db.query(`SELECT COUNT(a.id) as total FROM attendees a ${joinClause} ${whereClause}`, params);
        
        res.json({
            total: total[0].total || 0,
            byStatus: statusStats,
            byTicketType: ticketStats
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single attendee
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT a.*, e.title as event_title 
            FROM attendees a 
            LEFT JOIN events e ON a.event_id = e.id
            WHERE a.id = ?
        `, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Attendee not found' });
        res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// CREATE attendee
router.post('/', protect, async (req, res) => {
    const { name, email, phone, company, designation, ticket_type, status, event_id, notes } = req.body;
    try {
        if (req.user.role === 'manager') {
            const [evts] = await db.query('SELECT created_by FROM events WHERE id=?', [event_id]);
            if (evts.length === 0 || (evts[0].created_by !== req.user.id && String(event_id) !== String(req.user.assigned_event_id))) {
                return res.status(403).json({ error: 'You can only add attendees to your own or assigned events' });
            }
        } else if (req.user.role === 'employee') {
            if (!employeeAllowed(req, event_id)) {
                return res.status(403).json({ error: 'You can only add attendees to your assigned event' });
            }
        }

        const [result] = await db.query(
            'INSERT INTO attendees (name, email, phone, company, designation, ticket_type, status, event_id, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, email, phone, company, designation, ticket_type || 'general', status || 'registered', event_id || null, notes, req.user.id]
        );
        res.status(201).json({ message: 'Attendee added', id: result.insertId });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// UPDATE attendee
router.put('/:id', protect, async (req, res) => {
    const { name, email, phone, company, designation, ticket_type, status, event_id, notes } = req.body;
    try {
        const [cur] = await db.query('SELECT event_id FROM attendees WHERE id = ?', [req.params.id]);
        if (cur.length === 0) return res.status(404).json({ error: 'Attendee not found' });

        if (req.user.role === 'manager') {
            const [currentEntity] = await db.query('SELECT a.event_id, e.created_by FROM attendees a JOIN events e ON a.event_id = e.id WHERE a.id = ?', [req.params.id]);
            const isAllowed = currentEntity.length > 0 && (currentEntity[0].created_by === req.user.id || String(currentEntity[0].event_id) === String(req.user.assigned_event_id));
            if (!isAllowed) {
                return res.status(403).json({ error: 'You do not own this attendee' });
            }
        } else if (req.user.role === 'employee') {
            if (!employeeAllowed(req, cur[0].event_id)) {
                return res.status(403).json({ error: 'You can only edit attendees in your assigned event' });
            }
        }

        await db.query(
            'UPDATE attendees SET name=?, email=?, phone=?, company=?, designation=?, ticket_type=?, status=?, event_id=?, notes=? WHERE id=?',
            [name, email, phone, company, designation, ticket_type, status, event_id || null, notes, req.params.id]
        );
        res.json({ message: 'Attendee updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE attendee
router.delete('/:id', protect, async (req, res) => {
    try {
        const [cur] = await db.query('SELECT event_id FROM attendees WHERE id = ?', [req.params.id]);
        if (cur.length === 0) return res.status(404).json({ error: 'Attendee not found' });

        if (req.user.role === 'manager') {
            const [currentEntity] = await db.query('SELECT a.event_id, e.created_by FROM attendees a JOIN events e ON a.event_id = e.id WHERE a.id = ?', [req.params.id]);
            const isAllowed = currentEntity.length > 0 && (currentEntity[0].created_by === req.user.id || String(currentEntity[0].event_id) === String(req.user.assigned_event_id));
            if (!isAllowed) {
                return res.status(403).json({ error: 'You do not own this attendee' });
            }
        } else if (req.user.role === 'employee') {
            if (!employeeAllowed(req, cur[0].event_id)) {
                return res.status(403).json({ error: 'You can only delete attendees in your assigned event' });
            }
        }

        await db.query('DELETE FROM attendees WHERE id=?', [req.params.id]);
        res.json({ message: 'Attendee deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
