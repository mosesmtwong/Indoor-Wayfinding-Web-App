const express = require('express');
const cors = require('cors');
const { initDb } = require('./db/database');
const deskRoutes = require('./routes/deskRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database on startup
initDb();

// Routes
app.use('/api/desks', deskRoutes);
app.use('/api/bookings', bookingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Desk Booking API running on http://localhost:${PORT}`);
});

module.exports = app;
