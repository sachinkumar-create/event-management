const express = require('express');
// Restart trigger
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.use('/uploads', express.static('uploads'));

// Test DB Connection
const db = require('./config/db');
db.query('SELECT 1')
    .then(() => console.log('✅ DB Connected Successfully'))
    .catch(err => {
        console.error('❌ DB Connection Failed!');
        console.error('Error Trace:', err.message);
        console.log('TIP: Ensure MySQL service is running and credentials in .env are correct.');
    });

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/speakers', require('./routes/speakerRoutes'));
app.use('/api/partners', require('./routes/partnerRoutes'));
app.use('/api/partner-categories', require('./routes/partnerCategoryRoutes'));
app.use('/api/agendas', require('./routes/agendaRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/attendees', require('./routes/attendeeRoutes'));
app.use('/api/openai', require('./routes/openaiRoutes'));
app.use('/api/travel', require('./routes/travelRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

