const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `speaker-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// Helper: check if employee is allowed for given event_id
const employeeAllowed = (req, event_id) => {
    if (req.user.role !== 'employee') return true;
    return String(req.user.assigned_event_id) === String(event_id);
};

router.get('/', protect, async (req, res) => {
    try {
        let query = `SELECT s.*, e.title as event_title FROM speakers s LEFT JOIN events e ON s.event_id = e.id`;
        let params = [];

        if (req.user.role === 'manager') {
            query += ` WHERE e.created_by = ? OR s.event_id = ?`;
            params.push(req.user.id, req.user.assigned_event_id);
        } else if (req.user.role === 'employee') {
            if (!req.user.assigned_event_id) return res.json([]);
            query += ` WHERE s.event_id = ?`;
            params.push(req.user.assigned_event_id);
        }

        const [speakers] = await db.query(query, params);
        res.json(speakers);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
    try {
        const [speakers] = await db.query(`
            SELECT s.*, e.title as event_title 
            FROM speakers s LEFT JOIN events e ON s.event_id = e.id WHERE s.id = ?
        `, [req.params.id]);
        if (speakers.length === 0) return res.status(404).json({ error: 'Speaker not found' });
        res.json(speakers[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', protect, upload.single('photo'), async (req, res) => {
    const { name, bio, designation, company, email, role, event_id, topic, panel, mobile_no, linkedin_url } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email is mandatory for speakers' });
    }

    let photo_url = req.body.photo_url;
    if (req.file) photo_url = `/uploads/${req.file.filename}`;

    try {
        if (req.user.role === 'manager') {
            const [evts] = await db.query('SELECT created_by FROM events WHERE id=?', [event_id]);
            if (evts.length === 0 || (evts[0].created_by !== req.user.id && String(event_id) !== String(req.user.assigned_event_id)))
                return res.status(403).json({ error: 'You can only add speakers to your own or assigned events' });
        }
        if (req.user.role === 'employee' && !employeeAllowed(req, event_id))
            return res.status(403).json({ error: 'You can only add speakers to your assigned event' });

        const [result] = await db.query(
            'INSERT INTO speakers (name, bio, photo_url, designation, company, email, role, event_id, created_by, topic, panel, mobile_no, linkedin_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, bio, photo_url, designation, company, email, role, event_id || null, req.user.id, topic || null, panel || null, mobile_no || null, linkedin_url || null]
        );
        res.status(201).json({ message: 'Speaker added' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', protect, upload.single('photo'), async (req, res) => {
    const { name, bio, designation, company, email, role, event_id, sns_card_url, topic, panel, mobile_no, linkedin_url } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email is mandatory for speakers' });
    }

    let photo_url = req.body.photo_url;
    if (req.file) photo_url = `/uploads/${req.file.filename}`;

    try {
        const [cur] = await db.query('SELECT s.event_id, e.created_by FROM speakers s LEFT JOIN events e ON s.event_id = e.id WHERE s.id = ?', [req.params.id]);

        const isManagerAllowed = req.user.role === 'manager' && cur.length > 0 && 
            (cur[0].created_by === req.user.id || String(cur[0].event_id) === String(req.user.assigned_event_id));

        if (req.user.role === 'manager' && !isManagerAllowed)
            return res.status(403).json({ error: 'You do not have permission to edit this speaker' });
        if (req.user.role === 'employee' && cur.length > 0 && !employeeAllowed(req, cur[0].event_id))
            return res.status(403).json({ error: 'You can only edit speakers in your assigned event' });

        await db.query('UPDATE speakers SET name=?, bio=?, photo_url=?, designation=?, company=?, email=?, role=?, event_id=?, sns_card_url=?, topic=?, panel=?, mobile_no=?, linkedin_url=? WHERE id=?',
            [name, bio, photo_url, designation, company, email, role, event_id || null, sns_card_url || null, topic || null, panel || null, mobile_no || null, linkedin_url || null, req.params.id]);
        res.json({ message: 'Speaker updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/save-sns', protect, upload.single('sns_card'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    try {
        const url = `/uploads/${req.file.filename}`;
        await db.query('UPDATE speakers SET sns_card_url=? WHERE id=?', [url, req.params.id]);
        res.json({ message: 'SNS Card saved successfully', url });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', protect, async (req, res) => {
    try {
        const [cur] = await db.query('SELECT s.event_id, e.created_by FROM speakers s LEFT JOIN events e ON s.event_id = e.id WHERE s.id = ?', [req.params.id]);

        const isManagerAllowed = req.user.role === 'manager' && cur.length > 0 && 
            (cur[0].created_by === req.user.id || String(cur[0].event_id) === String(req.user.assigned_event_id));

        if (req.user.role === 'manager' && !isManagerAllowed)
            return res.status(403).json({ error: 'You do not have permission to delete this speaker' });
        if (req.user.role === 'employee' && cur.length > 0 && !employeeAllowed(req, cur[0].event_id))
            return res.status(403).json({ error: 'You can only delete speakers in your assigned event' });

        await db.query('DELETE FROM speakers WHERE id=?', [req.params.id]);
        res.json({ message: 'Speaker deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
