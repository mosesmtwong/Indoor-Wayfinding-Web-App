const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

// GET /api/bookings/me?user_id=user-1 — user's bookings
// (this must be defined BEFORE /:id so it doesn't match "me" as an id)
router.get('/me', bookingController.getMyBookings);

// POST /api/bookings — create booking
router.post('/', bookingController.createBooking);

// DELETE /api/bookings/:id — cancel booking
router.delete('/:id', bookingController.cancelBooking);

module.exports = router;
