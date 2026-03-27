const jwt = require('jsonwebtoken');
const db = require('../config/db');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Fetch fresh user from DB to handle dynamic assignment/role changes
            const [users] = await db.query('SELECT id, name, email, role, assigned_event_id, assigned_task FROM users WHERE id = ?', [decoded.id]);
            if (users.length === 0) return res.status(401).json({ error: 'User no longer exists' });
            
            req.user = users[0];
            next();
        } catch (error) {
            res.status(401).json({ error: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ error: 'Not authorized, no token' });
    }
};

module.exports = { protect };
