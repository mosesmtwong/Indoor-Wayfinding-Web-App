const bookingService = require('../services/bookingService');
const deskService = require('../services/deskService');
const { isValidDatetime } = require('../utils/validators');

/**
 * Controller for booking-related endpoints.
 */

// POST /api/bookings — create a new booking
function createBooking(req, res) {
  try {
    const { desk_id, user_id, start_time, end_time } = req.body;

    // --- Validation ---
    if (!desk_id || !user_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'Missing required fields: desk_id, user_id, start_time, end_time' });
    }

    if (!isValidDatetime(start_time) || !isValidDatetime(end_time)) {
      return res.status(400).json({ error: 'Invalid datetime format. Use ISO 8601 format.' });
    }

    if (new Date(start_time) >= new Date(end_time)) {
      return res.status(400).json({ error: 'start_time must be before end_time' });
    }

    // Check if desk exists
    const desk = deskService.getDeskById(desk_id);
    if (!desk) {
      return res.status(404).json({ error: 'Desk not found' });
    }

    // --- Conflict detection ---
    if (bookingService.hasConflict(desk_id, start_time, end_time)) {
      return res.status(409).json({ error: 'Booking conflict: this desk is already booked for the requested time' });
    }

    // All good — create the booking
    const booking = bookingService.createBooking(desk_id, user_id, start_time, end_time);
    res.status(201).json({ message: 'Booking created', booking });
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
}

// DELETE /api/bookings/:id — cancel a booking
function cancelBooking(req, res) {
  try {
    const bookingId = parseInt(req.params.id);

    // Check if booking exists
    const booking = bookingService.getBookingById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    const success = bookingService.cancelBooking(bookingId);
    if (success) {
      res.json({ message: 'Booking cancelled successfully' });
    } else {
      res.status(400).json({ error: 'Could not cancel booking' });
    }
  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
}

// GET /api/bookings/me?user_id=user-1
function getMyBookings(req, res) {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'Missing required query param: user_id' });
    }

    const bookings = bookingService.getBookingsByUser(user_id);
    res.json({ bookings });
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
}

module.exports = { createBooking, cancelBooking, getMyBookings };
