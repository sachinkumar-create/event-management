const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

const mergeSpeakers = async (agendas) => {
    if (agendas.length === 0) return [];
    const agendaIds = agendas.map(a => a.id);
    const [speakerMappings] = await db.query(`
        SELECT asp.agenda_id, s.id, s.name, s.photo_url, s.designation, s.company
        FROM agenda_speakers asp JOIN speakers s ON asp.speaker_id = s.id
        WHERE asp.agenda_id IN (?)`, [agendaIds]);
    return agendas.map(a => ({
        ...a,
        speakers: speakerMappings.filter(sm => sm.agenda_id === a.id)
            .map(sm => ({ id: sm.id, name: sm.name, photo_url: sm.photo_url, designation: sm.designation, company: sm.company }))
    }));
};

const employeeAllowed = (req, event_id) => {
    if (req.user.role !== 'employee') return true;
    return String(req.user.assigned_event_id) === String(event_id);
};

router.get('/', protect, async (req, res) => {
    try {
        let query = `SELECT a.* FROM agendas a JOIN events e ON a.event_id = e.id`;
        let params = [];
        if (req.user.role === 'manager') {
            query += ` WHERE e.created_by = ? OR a.event_id = ?`;
            params.push(req.user.id, req.user.assigned_event_id);
        } else if (req.user.role === 'employee') {
            const eventId = req.user.assigned_event_id;
            if (!eventId) return res.json([]);
            query += ` WHERE a.event_id = ?`;
            params.push(eventId);
        }
        query += ` ORDER BY a.event_id, a.day_number, a.sequence, a.start_time`;
        const [agendas] = await db.query(query, params);
        res.json(await mergeSpeakers(agendas));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:eventId', protect, async (req, res) => {
    try {
        if (req.user.role === 'manager') {
            const [evts] = await db.query('SELECT created_by FROM events WHERE id=?', [req.params.eventId]);
            if (evts.length === 0 || (evts[0].created_by !== req.user.id && String(req.params.eventId) !== String(req.user.assigned_event_id))) return res.json([]);
        }
        if (req.user.role === 'employee' && !employeeAllowed(req, req.params.eventId)) return res.json([]);

        const [agendas] = await db.query(`SELECT * FROM agendas WHERE event_id = ? ORDER BY day_number, sequence, start_time`, [req.params.eventId]);
        res.json(await mergeSpeakers(agendas));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/reorder', protect, async (req, res) => {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) return res.status(400).json({ error: 'No updates provided' });
    
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        for (const update of updates) {
            // Check ownership
            const [cur] = await connection.query('SELECT a.event_id, e.created_by FROM agendas a JOIN events e ON a.event_id = e.id WHERE a.id = ?', [update.id]);
            const isManagerAllowed = req.user.role === 'manager' && cur.length > 0 && 
                (cur[0].created_by === req.user.id || String(cur[0].event_id) === String(req.user.assigned_event_id));

            if (req.user.role === 'manager' && !isManagerAllowed) {
                throw new Error('You do not have permission for this agenda');
            }
            if (req.user.role === 'employee' && cur.length > 0 && !employeeAllowed(req, cur[0].event_id)) {
                throw new Error('Unauthorized for this event');
            }
            
            await connection.query('UPDATE agendas SET sequence=?, start_time=?, end_time=? WHERE id=?', 
                [update.sequence, update.start_time, update.end_time, update.id]);
        }
        await connection.commit();
        res.json({ message: 'Agendas reordered successfully' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

router.post('/', protect, async (req, res) => {
    const { event_id, day_number, start_time, end_time, title, description, speaker_ids } = req.body;
    try {
        if (req.user.role === 'manager') {
            const [evts] = await db.query('SELECT created_by FROM events WHERE id=?', [event_id]);
            if (evts.length === 0 || (evts[0].created_by !== req.user.id && String(event_id) !== String(req.user.assigned_event_id)))
                return res.status(403).json({ error: 'You can only add agendas to your own or assigned events' });
        }
        if (req.user.role === 'employee' && !employeeAllowed(req, event_id))
            return res.status(403).json({ error: 'You can only add agendas to your assigned event' });

        const [result] = await db.query('INSERT INTO agendas (event_id, day_number, start_time, end_time, title, description) VALUES (?, ?, ?, ?, ?, ?)',
            [event_id, day_number, start_time, end_time, title, description]);
        const agendaId = result.insertId;
        if (Array.isArray(speaker_ids) && speaker_ids.length > 0) {
            await db.query('INSERT INTO agenda_speakers (agenda_id, speaker_id) VALUES ?', [speaker_ids.map(sid => [agendaId, sid])]);
        }
        res.status(201).json({ message: 'Agenda created', id: agendaId });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', protect, async (req, res) => {
    const { day_number, start_time, end_time, title, description, speaker_ids } = req.body;
    try {
        const [cur] = await db.query('SELECT a.event_id, e.created_by FROM agendas a JOIN events e ON a.event_id = e.id WHERE a.id = ?', [req.params.id]);
        const isManagerAllowed = req.user.role === 'manager' && cur.length > 0 && 
            (cur[0].created_by === req.user.id || String(cur[0].event_id) === String(req.user.assigned_event_id));

        if (req.user.role === 'manager' && !isManagerAllowed)
            return res.status(403).json({ error: 'You do not have permission to edit this agenda' });
        if (req.user.role === 'employee' && cur.length > 0 && !employeeAllowed(req, cur[0].event_id))
            return res.status(403).json({ error: 'You can only edit agendas in your assigned event' });

        await db.query('UPDATE agendas SET day_number=?, start_time=?, end_time=?, title=?, description=? WHERE id=?',
            [day_number, start_time, end_time, title, description, req.params.id]);
        await db.query('DELETE FROM agenda_speakers WHERE agenda_id = ?', [req.params.id]);
        if (Array.isArray(speaker_ids) && speaker_ids.length > 0) {
            await db.query('INSERT INTO agenda_speakers (agenda_id, speaker_id) VALUES ?', [speaker_ids.map(sid => [req.params.id, sid])]);
        }
        res.json({ message: 'Agenda updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', protect, async (req, res) => {
    try {
        const [cur] = await db.query('SELECT a.event_id, e.created_by FROM agendas a JOIN events e ON a.event_id = e.id WHERE a.id = ?', [req.params.id]);
        const isManagerAllowed = req.user.role === 'manager' && cur.length > 0 && 
            (cur[0].created_by === req.user.id || String(cur[0].event_id) === String(req.user.assigned_event_id));

        if (req.user.role === 'manager' && !isManagerAllowed)
            return res.status(403).json({ error: 'You do not have permission to delete this agenda' });
        if (req.user.role === 'employee' && cur.length > 0 && !employeeAllowed(req, cur[0].event_id))
            return res.status(403).json({ error: 'You can only delete agendas in your assigned event' });

        await db.query('DELETE FROM agendas WHERE id=?', [req.params.id]);
        res.json({ message: 'Agenda deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
