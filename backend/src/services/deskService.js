const { getDb } = require('../db/database');

/**
 * Desk service — handles all desk-related database queries.
 */

// Get all desks with their current availability computed from bookings
function getAllDesks() {
  const db = getDb();
  const now = new Date().toISOString();

  const desks = db.prepare('SELECT * FROM desks ORDER BY floor, name').all();

  // For each desk, check if there's an active booking right now
  const checkBooking = db.prepare(`
    SELECT COUNT(*) as count FROM bookings
    WHERE desk_id = ? AND status = 'active'
    AND start_time <= ? AND end_time > ?
  `);

  return desks.map(desk => {
    const { count } = checkBooking.get(desk.id, now, now);
    return {
      ...desk,
      status: count > 0 ? 'booked' : 'available'
    };
  });
}

// Get a single desk by ID
function getDeskById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM desks WHERE id = ?').get(id);
}

// Get available time slots for a desk on a given date
// Returns 30-minute intervals from 8:00 to 18:00
function getAvailableSlots(deskId, date) {
  const db = getDb();

  // Get all active bookings for this desk on the given date
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  const bookings = db.prepare(`
    SELECT start_time, end_time FROM bookings
    WHERE desk_id = ? AND status = 'active'
    AND start_time < ? AND end_time > ?
    ORDER BY start_time
  `).all(deskId, dayEnd, dayStart);

  // Generate 30-min slots from 8:00 to 18:00
  const slots = [];
  for (let hour = 8; hour < 18; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const startHour = String(hour).padStart(2, '0');
      const startMin = String(min).padStart(2, '0');
      const endMin = min + 30;
      const endHour = endMin >= 60 ? hour + 1 : hour;
      const endMinStr = String(endMin % 60).padStart(2, '0');
      const endHourStr = String(endHour).padStart(2, '0');

      const slotStart = `${date}T${startHour}:${startMin}:00.000Z`;
      const slotEnd = `${date}T${endHourStr}:${endMinStr}:00.000Z`;

      // Check if this slot conflicts with any booking
      const isBooked = bookings.some(b => {
        return b.start_time < slotEnd && b.end_time > slotStart;
      });

      slots.push({
        start: slotStart,
        end: slotEnd,
        available: !isBooked
      });
    }
  }

  return slots;
}

module.exports = { getAllDesks, getDeskById, getAvailableSlots };
