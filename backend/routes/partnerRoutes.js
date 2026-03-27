const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `partner-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

const employeeAllowed = (req, event_id) => {
    if (req.user.role !== 'employee') return true;
    return String(req.user.assigned_event_id) === String(event_id);
};

router.get('/', protect, async (req, res) => {
    try {
        let query = `SELECT p.*, e.title as event_title, pc.name as category_name,
                       COUNT(pw.speaker_id) as wishlist_speaker_count,
                       GROUP_CONCAT(ws.name SEPARATOR '|||') as wishlist_speaker_names,
                       GROUP_CONCAT(IFNULL(ws.photo_url, '') SEPARATOR '|||') as wishlist_speaker_photos
            FROM partners p 
            LEFT JOIN events e ON p.event_id = e.id
            LEFT JOIN partner_categories pc ON p.category_id = pc.id
            LEFT JOIN partner_wishlist pw ON p.id = pw.partner_id
            LEFT JOIN speakers ws ON pw.speaker_id = ws.id`;
        let params = [];

        if (req.user.role === 'manager') {
            query += ` WHERE e.created_by = ? OR p.event_id = ?`;
            params.push(req.user.id, req.user.assigned_event_id);
        } else if (req.user.role === 'employee') {
            if (!req.user.assigned_event_id) return res.json([]);
            query += ` WHERE p.event_id = ?`;
            params.push(req.user.assigned_event_id);
        }

        query += ` GROUP BY p.id ORDER BY p.sequence ASC, p.name ASC`;
        const [partners] = await db.query(query, params);
        res.json(partners);
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
            const [cur] = await connection.query('SELECT p.event_id, e.created_by FROM partners p LEFT JOIN events e ON p.event_id = e.id WHERE p.id = ?', [update.id]);
            const isManagerAllowed = req.user.role === 'manager' && cur.length > 0 && 
                (cur[0].created_by === req.user.id || String(cur[0].event_id) === String(req.user.assigned_event_id));

            if (req.user.role === 'manager' && !isManagerAllowed) {
                throw new Error('You do not have permission for this partner');
            }
            if (req.user.role === 'employee' && cur.length > 0 && !employeeAllowed(req, cur[0].event_id)) {
                throw new Error('Unauthorized for this event');
            }
            
            await connection.query('UPDATE partners SET sequence=? WHERE id=?', 
                [update.sequence, update.id]);
        }
        await connection.commit();
        res.json({ message: 'Partners reordered successfully' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

router.post('/', protect, upload.single('logo'), async (req, res) => {
    const { name, website, event_id, category_id, sequence, wishlist, wishlist_speakers } = req.body;
    let logo_url = req.body.logo_url;
    if (req.file) logo_url = `/uploads/${req.file.filename}`;

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        if (req.user.role === 'manager') {
            const [evts] = await connection.query('SELECT created_by FROM events WHERE id=?', [event_id]);
            if (evts.length === 0 || (evts[0].created_by !== req.user.id && String(event_id) !== String(req.user.assigned_event_id))) {
                await connection.rollback();
                return res.status(403).json({ error: 'You can only add partners to your own or assigned events' });
            }
        }
        if (req.user.role === 'employee' && !employeeAllowed(req, event_id)) {
            await connection.rollback();
            return res.status(403).json({ error: 'You can only add partners to your assigned event' });
        }

        const [result] = await connection.query(
            'INSERT INTO partners (name, website, logo_url, category_id, event_id, sequence, wishlist, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, website, logo_url, category_id || null, event_id || null, sequence || 0, wishlist || null, req.user.id]
        );
        const partnerId = result.insertId;

        // Save wishlist speakers
        if (wishlist_speakers) {
            console.log('Saving wishlist speakers:', wishlist_speakers);
            const speakerIds = Array.isArray(wishlist_speakers) ? wishlist_speakers : JSON.parse(wishlist_speakers);
            if (speakerIds.length > 0) {
                const values = speakerIds.map(sid => [partnerId, sid]);
                await connection.query('INSERT INTO partner_wishlist (partner_id, speaker_id) VALUES ?', [values]);
            }
        }

        await connection.commit();
        res.status(201).json({ message: 'Partner added', id: partnerId });
    } catch (err) { 
        console.error('Error in POST /partners:', err);
        await connection.rollback();
        res.status(500).json({ error: err.message }); 
    } finally {
        connection.release();
    }
});

router.get('/:id', protect, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT p.*, e.title as event_title, pc.name as category_name
            FROM partners p 
            LEFT JOIN events e ON p.event_id = e.id
            LEFT JOIN partner_categories pc ON p.category_id = pc.id
            WHERE p.id = ?`, [req.params.id]);
        
        if (rows.length === 0) return res.status(404).json({ error: 'Partner not found' });
        const partner = rows[0];

        // Fetch wishlist speakers
        const [speakers] = await db.query(`
            SELECT s.* 
            FROM speakers s
            JOIN partner_wishlist pw ON s.id = pw.speaker_id
            WHERE pw.partner_id = ?`, [req.params.id]);
        
        partner.wishlist_speakers = speakers;
        res.json(partner);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', protect, upload.single('logo'), async (req, res) => {
    const { name, website, event_id, category_id, sequence, wishlist, wishlist_speakers } = req.body;
    let logo_url = req.body.logo_url;
    if (req.file) logo_url = `/uploads/${req.file.filename}`;

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const [cur] = await connection.query('SELECT p.event_id, e.created_by FROM partners p LEFT JOIN events e ON p.event_id = e.id WHERE p.id = ?', [req.params.id]);

        const isManagerAllowed = req.user.role === 'manager' && cur.length > 0 && 
            (cur[0].created_by === req.user.id || String(cur[0].event_id) === String(req.user.assigned_event_id));

        if (req.user.role === 'manager' && !isManagerAllowed) {
            await connection.rollback();
            return res.status(403).json({ error: 'You do not have permission to edit this partner' });
        }
        if (req.user.role === 'employee' && cur.length > 0 && !employeeAllowed(req, cur[0].event_id)) {
            await connection.rollback();
            return res.status(403).json({ error: 'You can only edit partners in your assigned event' });
        }

        await connection.query('UPDATE partners SET name=?, website=?, logo_url=?, event_id=?, category_id=?, sequence=?, wishlist=? WHERE id=?',
            [name, website, logo_url, event_id || null, category_id || null, sequence || 0, wishlist || null, req.params.id]);

        // Sync wishlist speakers
        if (wishlist_speakers) {
            console.log('Updating wishlist speakers:', wishlist_speakers);
            await connection.query('DELETE FROM partner_wishlist WHERE partner_id=?', [req.params.id]);
            const speakerIds = Array.isArray(wishlist_speakers) ? wishlist_speakers : JSON.parse(wishlist_speakers);
            if (speakerIds.length > 0) {
                const values = speakerIds.map(sid => [req.params.id, sid]);
                await connection.query('INSERT INTO partner_wishlist (partner_id, speaker_id) VALUES ?', [values]);
            }
        }

        await connection.commit();
        res.json({ message: 'Partner updated' });
    } catch (err) { 
        console.error('Error in PUT /partners/:id:', err);
        await connection.rollback();
        res.status(500).json({ error: err.message }); 
    } finally {
        connection.release();
    }
});

router.delete('/:id', protect, async (req, res) => {
    try {
        const [cur] = await db.query('SELECT p.event_id, e.created_by FROM partners p LEFT JOIN events e ON p.event_id = e.id WHERE p.id = ?', [req.params.id]);

        const isManagerAllowed = req.user.role === 'manager' && cur.length > 0 && 
            (cur[0].created_by === req.user.id || String(cur[0].event_id) === String(req.user.assigned_event_id));

        if (req.user.role === 'manager' && !isManagerAllowed)
            return res.status(403).json({ error: 'You do not have permission to delete this partner' });
        if (req.user.role === 'employee' && cur.length > 0 && !employeeAllowed(req, cur[0].event_id))
            return res.status(403).json({ error: 'You can only delete partners in your assigned event' });

        await db.query('DELETE FROM partners WHERE id=?', [req.params.id]);
        res.json({ message: 'Partner deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
