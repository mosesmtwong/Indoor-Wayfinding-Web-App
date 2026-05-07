const { getDb } = require('../db/database');

/**
 * Booking service — handles all booking-related database queries.
 */

// Check if a new booking would conflict with existing ones
// Two bookings conflict if: startA < endB AND endA > startB
function hasConflict(deskId, startTime, endTime, excludeBookingId = null) {
  const db = getDb();

  let query = `
    SELECT COUNT(*) as count FROM bookings
    WHERE desk_id = ? AND status = 'active'
    AND start_time < ? AND end_time > ?
  `;
  const params = [deskId, endTime, startTime];

  // If we're updating a booking, exclude it from conflict check
  if (excludeBookingId) {
    query += ' AND id != ?';
    params.push(excludeBookingId);
  }

  const { count } = db.prepare(query).get(...params);
  return count > 0;
}

// Create a new booking
function createBooking(deskId, userId, startTime, endTime) {
  const db = getDb();

  const result = db.prepare(`
    INSERT INTO bookings (desk_id, user_id, start_time, end_time, status)
    VALUES (?, ?, ?, ?, 'active')
  `).run(deskId, userId, startTime, endTime);

  return getBookingById(result.lastInsertRowid);
}

// Get a booking by ID
function getBookingById(id) {
  const db = getDb();
  return db.prepare(`
    SELECT b.*, d.name as desk_name, d.floor
    FROM bookings b
    JOIN desks d ON b.desk_id = d.id
    WHERE b.id = ?
  `).get(id);
}

// Cancel a booking (set status to 'cancelled')
function cancelBooking(id) {
  const db = getDb();
  const result = db.prepare(`
    UPDATE bookings SET status = 'cancelled' WHERE id = ? AND status = 'active'
  `).run(id);
  return result.changes > 0;
}

// Get all bookings for a user
function getBookingsByUser(userId) {
  const db = getDb();
  return db.prepare(`
    SELECT b.*, d.name as desk_name, d.floor
    FROM bookings b
    JOIN desks d ON b.desk_id = d.id
    WHERE b.user_id = ?
    ORDER BY b.start_time DESC
  `).all(userId);
}

module.exports = { hasConflict, createBooking, getBookingById, cancelBooking, getBookingsByUser };
