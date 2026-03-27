const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { protect } = require('../middleware/authMiddleware');

// Check Email Existence
router.post('/check-email', async (req, res) => {
    const { email } = req.body;
    try {
        const [users] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        res.json({ exists: users.length > 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Register
router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        const [exists] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (exists.length > 0) return res.status(400).json({ error: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await db.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, role || 'employee']);

        res.status(201).json({ message: 'User registered' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Current User Profile (Fresh from DB)
router.get('/me', protect, async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, name, email, role, assigned_event_id, assigned_task FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });
        
        const user = users[0];
        // Sign a fresh token with the latest assignment data
        const token = jwt.sign(
            { id: user.id, name: user.name, role: user.role, email: user.email, assigned_event_id: user.assigned_event_id },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({ user, token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin/Manager Invites User
router.post('/invite', protect, async (req, res) => {
    if (!['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Only admins and managers can invite' });
    }

    const { email, role, event_id, assigned_task } = req.body;

    // Managers can only invite employees
    if (req.user.role === 'manager' && role !== 'employee') {
        return res.status(403).json({ error: 'Managers can only invite employees' });
    }

    try {
        // Generate token
        const token = crypto.randomBytes(32).toString('hex');

        // Delete any existing invitation for this email
        await db.query('DELETE FROM invitations WHERE email = ?', [email]);

        // Create new invitation (works for both existing and new users)
        await db.query('INSERT INTO invitations (email, role, token, created_by, event_id, assigned_task) VALUES (?, ?, ?, ?, ?, ?)',
            [email, role, token, req.user.id, event_id || null, assigned_task || null]
        );

        const inviteLink = `/accept-invite/${token}`;
        res.status(201).json({ message: 'Invitation created', inviteLink, token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Validate Invitation Token
router.get('/validate-invite/:token', async (req, res) => {
    try {
        const [invitations] = await db.query(
            `SELECT i.email, i.role, i.event_id, i.assigned_task, e.title as event_title 
             FROM invitations i 
             LEFT JOIN events e ON i.event_id = e.id
             WHERE i.token = ?`,
            [req.params.token]
        );
        if (invitations.length === 0) return res.status(404).json({ error: 'Invalid or expired invitation' });

        res.json({
            email: invitations[0].email,
            role: invitations[0].role,
            event_id: invitations[0].event_id,
            event_title: invitations[0].event_title,
            assigned_task: invitations[0].assigned_task
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Accept Invitation (new user registration via invite link)
router.post('/accept-invite', async (req, res) => {
    const { token, name, password } = req.body;
    try {
        const [invitations] = await db.query('SELECT * FROM invitations WHERE token = ?', [token]);
        if (invitations.length === 0) return res.status(400).json({ error: 'Invalid or expired invitation' });

        const invite = invitations[0];

        // Check if user already exists (they should use accept-invite-existing instead)
        const [existingUser] = await db.query('SELECT id FROM users WHERE email = ?', [invite.email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'already_registered', message: 'This email is already registered. Please login and accept from your dashboard.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user with assigned event and task
        const [result] = await db.query(
            'INSERT INTO users (name, email, password, role, assigned_event_id, assigned_task) VALUES (?, ?, ?, ?, ?, ?)',
            [name, invite.email, hashedPassword, invite.role, invite.event_id || null, invite.assigned_task || null]
        );

        // Delete invitation
        await db.query('DELETE FROM invitations WHERE id = ?', [invite.id]);

        // Login the user immediately
        const authToken = jwt.sign(
            { id: result.insertId, name, role: invite.role, assigned_event_id: invite.event_id || null },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            message: 'Registration successful',
            token: authToken,
            user: { id: result.insertId, name, email: invite.email, role: invite.role, assigned_event_id: invite.event_id || null }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Accept Invitation for existing registered users (called after login)
router.post('/accept-invite-existing', protect, async (req, res) => {
    try {
        // Find pending invitation for this user's email
        const [invitations] = await db.query('SELECT * FROM invitations WHERE email = ?', [req.user.email]);
        if (invitations.length === 0) return res.status(404).json({ error: 'No pending invitation found' });

        const invite = invitations[0];

        // Update user's role and assigned event/task
        await db.query(
            'UPDATE users SET role = ?, assigned_event_id = ?, assigned_task = ? WHERE id = ?',
            [invite.role, invite.event_id || null, invite.assigned_task || null, req.user.id]
        );

        // Delete invitation
        await db.query('DELETE FROM invitations WHERE id = ?', [invite.id]);

        // Issue new token with updated role
        const [updatedUser] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        const u = updatedUser[0];
        const authToken = jwt.sign(
            { id: u.id, name: u.name, role: u.role, assigned_event_id: u.assigned_event_id },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            message: 'Invitation accepted',
            token: authToken,
            user: { id: u.id, name: u.name, email: u.email, role: u.role, assigned_event_id: u.assigned_event_id }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Decline Invitation
router.post('/decline-invite', protect, async (req, res) => {
    try {
        await db.query('DELETE FROM invitations WHERE email = ?', [req.user.email]);
        res.json({ message: 'Invitation declined' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin/Manager Delete Invitation
router.delete('/invitation/:email', protect, async (req, res) => {
    if (!['admin', 'manager'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
    try {
        if (req.user.role === 'manager') {
            const [check] = await db.query('SELECT created_by FROM invitations WHERE email = ?', [req.params.email]);
            if (check.length > 0 && check[0].created_by !== req.user.id) {
                return res.status(403).json({ error: 'You can only delete invitations you created' });
            }
        }
        await db.query('DELETE FROM invitations WHERE email = ?', [req.params.email]);
        res.json({ message: 'Invitation revoked' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(400).json({ error: 'Invalid credentials' });

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        // Check for pending invitation
        const [invitations] = await db.query(
            `SELECT i.*, e.title as event_title 
             FROM invitations i 
             LEFT JOIN events e ON i.event_id = e.id
             WHERE i.email = ?`,
            [email]
        );

        const pendingInvite = invitations.length > 0 ? {
            role: invitations[0].role,
            event_id: invitations[0].event_id,
            event_title: invitations[0].event_title,
            assigned_task: invitations[0].assigned_task,
            token: invitations[0].token
        } : null;

        const token = jwt.sign(
            { id: user.id, name: user.name, role: user.role, email: user.email, assigned_event_id: user.assigned_event_id },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, assigned_event_id: user.assigned_event_id },
            pendingInvite
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
