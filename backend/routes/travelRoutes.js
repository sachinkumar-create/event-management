const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

// Helper: check if employee is allowed for given speaker's event
const employeeAllowedForSpeaker = async (req, speaker_id) => {
    if (req.user.role !== 'employee') return true;
    if (!req.user.assigned_event_id) return false;
    const [rows] = await db.query('SELECT event_id FROM speakers WHERE id = ?', [speaker_id]);
    return rows.length > 0 && String(rows[0].event_id) === String(req.user.assigned_event_id);
};

// GET all travel records (with speaker name)
router.get('/', protect, async (req, res) => {
    try {
        let query = `
            SELECT t.*, s.name as speaker_name, s.photo_url as speaker_photo
            FROM speaker_travel t
            LEFT JOIN speakers s ON t.speaker_id = s.id
            LEFT JOIN events e ON s.event_id = e.id
            WHERE 1=1
        `;
        const params = [];

        if (req.user.role === 'manager') {
            query += ' AND (e.created_by = ? OR s.event_id = ?)';
            params.push(req.user.id, req.user.assigned_event_id);
        } else if (req.user.role === 'employee') {
            if (!req.user.assigned_event_id) return res.json([]);
            query += ' AND s.event_id = ?';
            params.push(req.user.assigned_event_id);
        }

        if (req.query.speaker_id) {
            query += ' AND t.speaker_id = ?';
            params.push(req.query.speaker_id);
        }
        query += ' ORDER BY t.departure_date ASC';
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET travel stats summary
router.get('/stats/summary', protect, async (req, res) => {
    try {
        let joinStr = 'JOIN speakers s ON t.speaker_id = s.id JOIN events e ON s.event_id = e.id';
        let whereStr = "WHERE t.status != 'cancelled'";
        let allWhereStr = '';
        let params = [];

        if (req.user.role === 'manager') {
            whereStr += ' AND (e.created_by = ? OR s.event_id = ?)';
            allWhereStr = 'WHERE (e.created_by = ? OR s.event_id = ?)';
            params.push(req.user.id, req.user.assigned_event_id);
        } else if (req.user.role === 'employee') {
            if (!req.user.assigned_event_id) return res.json({ totalCost: 0, byType: [], byStatus: [] });
            whereStr += ' AND s.event_id = ?';
            allWhereStr = 'WHERE s.event_id = ?';
            params.push(req.user.assigned_event_id);
        }

        const [totalCost] = await db.query(`
            SELECT COALESCE(SUM(t.cost), 0) as total_cost FROM speaker_travel t ${joinStr} ${whereStr}
        `, params);
        const [byType] = await db.query(`
            SELECT t.travel_type, COUNT(t.id) as count, COALESCE(SUM(t.cost), 0) as total_cost 
            FROM speaker_travel t ${joinStr} ${whereStr} GROUP BY t.travel_type
        `, params);
        const [byStatus] = await db.query(`
            SELECT t.status, COUNT(t.id) as count FROM speaker_travel t ${joinStr} ${allWhereStr} GROUP BY t.status
        `, params);
        
        res.json({
            totalCost: totalCost[0].total_cost,
            byType,
            byStatus
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET travel for a specific speaker
router.get('/speaker/:speakerId', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM speaker_travel WHERE speaker_id = ? ORDER BY departure_date ASC',
            [req.params.speakerId]
        );
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single travel record
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT t.*, s.name as speaker_name FROM speaker_travel t LEFT JOIN speakers s ON t.speaker_id = s.id WHERE t.id = ?',
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Travel record not found' });
        res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// CREATE travel record
router.post('/', protect, async (req, res) => {
    const { speaker_id, travel_type, title, details, from_location, to_location, departure_date, arrival_date, booking_ref, cost, currency, status, notes } = req.body;
    try {
        if (req.user.role === 'manager') {
            const [evts] = await db.query('SELECT e.event_id, e.created_by FROM speakers s JOIN events e ON s.event_id = e.id WHERE s.id = ?', [speaker_id]);
            if (evts.length === 0 || (evts[0].created_by !== req.user.id && String(evts[0].event_id) !== String(req.user.assigned_event_id))) {
                return res.status(403).json({ error: 'You can only add travel to speakers in your own or assigned events' });
            }
        } else if (req.user.role === 'employee') {
            const allowed = await employeeAllowedForSpeaker(req, speaker_id);
            if (!allowed) {
                return res.status(403).json({ error: 'You can only add travel to speakers in your assigned event' });
            }
        }

        const [result] = await db.query(
            `INSERT INTO speaker_travel (speaker_id, travel_type, title, details, from_location, to_location, departure_date, arrival_date, booking_ref, cost, currency, status, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [speaker_id, travel_type, title, details, from_location, to_location, departure_date || null, arrival_date || null, booking_ref, cost || 0, currency || 'INR', status || 'pending', notes]
        );
        res.status(201).json({ message: 'Travel record added', id: result.insertId });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// UPDATE travel record
router.put('/:id', protect, async (req, res) => {
    const { speaker_id, travel_type, title, details, from_location, to_location, departure_date, arrival_date, booking_ref, cost, currency, status, notes } = req.body;
    try {
        const [cur] = await db.query('SELECT speaker_id FROM speaker_travel WHERE id = ?', [req.params.id]);
        if (cur.length === 0) return res.status(404).json({ error: 'Travel record not found' });

        if (req.user.role === 'manager') {
            const [currentEntity] = await db.query('SELECT s.event_id, e.created_by FROM speaker_travel t JOIN speakers s ON t.speaker_id = s.id JOIN events e ON s.event_id = e.id WHERE t.id = ?', [req.params.id]);
            const isAllowed = currentEntity.length > 0 && (currentEntity[0].created_by === req.user.id || String(currentEntity[0].event_id) === String(req.user.assigned_event_id));
            if (!isAllowed) {
                return res.status(403).json({ error: 'You do not own this travel record' });
            }
        } else if (req.user.role === 'employee') {
            const allowed = await employeeAllowedForSpeaker(req, cur[0].speaker_id);
            if (!allowed) {
                return res.status(403).json({ error: 'You can only edit travel in your assigned event' });
            }
        }

        await db.query(
            `UPDATE speaker_travel SET speaker_id=?, travel_type=?, title=?, details=?, from_location=?, to_location=?, departure_date=?, arrival_date=?, booking_ref=?, cost=?, currency=?, status=?, notes=? WHERE id=?`,
            [speaker_id, travel_type, title, details, from_location, to_location, departure_date || null, arrival_date || null, booking_ref, cost || 0, currency || 'INR', status, notes, req.params.id]
        );
        res.json({ message: 'Travel record updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE travel record
router.delete('/:id', protect, async (req, res) => {
    try {
        const [cur] = await db.query('SELECT speaker_id FROM speaker_travel WHERE id = ?', [req.params.id]);
        if (cur.length === 0) return res.status(404).json({ error: 'Travel record not found' });

        if (req.user.role === 'manager') {
            const [currentEntity] = await db.query('SELECT s.event_id, e.created_by FROM speaker_travel t JOIN speakers s ON t.speaker_id = s.id JOIN events e ON s.event_id = e.id WHERE t.id = ?', [req.params.id]);
            const isAllowed = currentEntity.length > 0 && (currentEntity[0].created_by === req.user.id || String(currentEntity[0].event_id) === String(req.user.assigned_event_id));
            if (!isAllowed) {
                return res.status(403).json({ error: 'You do not own this travel record' });
            }
        } else if (req.user.role === 'employee') {
            const allowed = await employeeAllowedForSpeaker(req, cur[0].speaker_id);
            if (!allowed) {
                return res.status(403).json({ error: 'You can only delete travel in your assigned event' });
            }
        }

        await db.query('DELETE FROM speaker_travel WHERE id=?', [req.params.id]);
        res.json({ message: 'Travel record deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
