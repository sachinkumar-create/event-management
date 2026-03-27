const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

// Get all categories
router.get('/', async (req, res) => {
    try {
        const [categories] = await db.query('SELECT * FROM partner_categories ORDER BY name ASC');
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create category (Admin only conceptually, but using protect for now)
router.post('/', protect, async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    try {
        await db.query('INSERT INTO partner_categories (name) VALUES (?)', [name]);
        res.status(201).json({ message: 'Category created' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Category already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Update category
router.put('/:id', protect, async (req, res) => {
    const { name } = req.body;
    try {
        await db.query('UPDATE partner_categories SET name = ? WHERE id = ?', [name, req.params.id]);
        res.json({ message: 'Category updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete category
router.delete('/:id', protect, async (req, res) => {
    try {
        await db.query('DELETE FROM partner_categories WHERE id = ?', [req.params.id]);
        res.json({ message: 'Category deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
