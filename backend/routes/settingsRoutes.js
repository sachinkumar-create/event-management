const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// GET all settings (public)
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT setting_key, setting_value FROM settings');
        const settings = rows.reduce((acc, row) => {
            acc[row.setting_key] = row.setting_value;
            return acc;
        }, {});
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST to update logo (admin only)
router.post('/logo', protect, upload.single('logo'), async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can change the portal logo' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'No logo file provided' });
    }

    const logoUrl = `/uploads/${req.file.filename}`;

    try {
        await db.query(
            'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
            ['portal_logo', logoUrl, logoUrl]
        );
        res.json({ message: 'Portal logo updated successfully', logoUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST to update any setting (admin only)
router.post('/', protect, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can update settings' });
    }

    const { key, value } = req.body;

    if (!key) {
        return res.status(400).json({ error: 'Setting key is required' });
    }

    try {
        await db.query(
            'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
            [key, String(value), String(value)]
        );
        res.json({ message: `Setting ${key} updated successfully` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
