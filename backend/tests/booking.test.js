const Database = require('better-sqlite3');
const path = require('path');

/**
 * Unit tests for the booking conflict logic.
 * We use an in-memory SQLite database so tests are fast and isolated.
 */

// We'll set up a fresh in-memory DB for each test
let db;

beforeEach(() => {
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE desks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      floor INTEGER NOT NULL,
      location TEXT NOT NULL
    );

    CREATE TABLE bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      desk_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY (desk_id) REFERENCES desks(id)
    );
  `);

  // Insert a test desk
  db.prepare('INSERT INTO desks (name, floor, location) VALUES (?, ?, ?)').run(
    'Test-Desk', 1, '{"x":0,"y":0}'
  );
});

afterEach(() => {
  db.close();
});

// Helper: check for booking conflict (same logic as bookingService)
function hasConflict(deskId, startTime, endTime) {
  const { count } = db.prepare(`
    SELECT COUNT(*) as count FROM bookings
    WHERE desk_id = ? AND status = 'active'
    AND start_time < ? AND end_time > ?
  `).get(deskId, endTime, startTime);
  return count > 0;
}

// Helper: insert a booking
function insertBooking(deskId, userId, startTime, endTime, status = 'active') {
  db.prepare(
    'INSERT INTO bookings (desk_id, user_id, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)'
  ).run(deskId, userId, startTime, endTime, status);
}

describe('Booking Conflict Detection', () => {
  test('no conflict when no bookings exist', () => {
    const result = hasConflict(1, '2026-05-05T09:00:00.000Z', '2026-05-05T10:00:00.000Z');
    expect(result).toBe(false);
  });

  test('detects overlapping booking (new starts during existing)', () => {
    // Existing: 9:00 - 11:00
    insertBooking(1, 'user-1', '2026-05-05T09:00:00.000Z', '2026-05-05T11:00:00.000Z');

    // New: 10:00 - 12:00 (starts during existing)
    const result = hasConflict(1, '2026-05-05T10:00:00.000Z', '2026-05-05T12:00:00.000Z');
    expect(result).toBe(true);
  });

  test('detects overlapping booking (new ends during existing)', () => {
    // Existing: 10:00 - 12:00
    insertBooking(1, 'user-1', '2026-05-05T10:00:00.000Z', '2026-05-05T12:00:00.000Z');

    // New: 09:00 - 11:00 (ends during existing)
    const result = hasConflict(1, '2026-05-05T09:00:00.000Z', '2026-05-05T11:00:00.000Z');
    expect(result).toBe(true);
  });

  test('detects overlapping booking (new fully inside existing)', () => {
    // Existing: 09:00 - 14:00
    insertBooking(1, 'user-1', '2026-05-05T09:00:00.000Z', '2026-05-05T14:00:00.000Z');

    // New: 10:00 - 12:00 (fully inside)
    const result = hasConflict(1, '2026-05-05T10:00:00.000Z', '2026-05-05T12:00:00.000Z');
    expect(result).toBe(true);
  });

  test('detects overlapping booking (new fully contains existing)', () => {
    // Existing: 10:00 - 12:00
    insertBooking(1, 'user-1', '2026-05-05T10:00:00.000Z', '2026-05-05T12:00:00.000Z');

    // New: 09:00 - 14:00 (fully contains existing)
    const result = hasConflict(1, '2026-05-05T09:00:00.000Z', '2026-05-05T14:00:00.000Z');
    expect(result).toBe(true);
  });

  test('no conflict when booking is right after existing', () => {
    // Existing: 09:00 - 10:00
    insertBooking(1, 'user-1', '2026-05-05T09:00:00.000Z', '2026-05-05T10:00:00.000Z');

    // New: 10:00 - 11:00 (starts exactly when existing ends)
    const result = hasConflict(1, '2026-05-05T10:00:00.000Z', '2026-05-05T11:00:00.000Z');
    expect(result).toBe(false);
  });

  test('no conflict when booking is right before existing', () => {
    // Existing: 10:00 - 11:00
    insertBooking(1, 'user-1', '2026-05-05T10:00:00.000Z', '2026-05-05T11:00:00.000Z');

    // New: 09:00 - 10:00 (ends exactly when existing starts)
    const result = hasConflict(1, '2026-05-05T09:00:00.000Z', '2026-05-05T10:00:00.000Z');
    expect(result).toBe(false);
  });

  test('no conflict with a different desk', () => {
    // Insert a second desk
    db.prepare('INSERT INTO desks (name, floor, location) VALUES (?, ?, ?)').run(
      'Other-Desk', 1, '{"x":1,"y":1}'
    );

    // Existing: desk 1, 09:00 - 11:00
    insertBooking(1, 'user-1', '2026-05-05T09:00:00.000Z', '2026-05-05T11:00:00.000Z');

    // New: desk 2, same time — should NOT conflict
    const result = hasConflict(2, '2026-05-05T09:00:00.000Z', '2026-05-05T11:00:00.000Z');
    expect(result).toBe(false);
  });

  test('cancelled bookings do not cause conflicts', () => {
    // Existing: cancelled booking
    insertBooking(1, 'user-1', '2026-05-05T09:00:00.000Z', '2026-05-05T11:00:00.000Z', 'cancelled');

    // New: overlapping time — should NOT conflict (existing is cancelled)
    const result = hasConflict(1, '2026-05-05T09:00:00.000Z', '2026-05-05T11:00:00.000Z');
    expect(result).toBe(false);
  });

  test('exact same time slot conflicts', () => {
    insertBooking(1, 'user-1', '2026-05-05T09:00:00.000Z', '2026-05-05T10:00:00.000Z');

    const result = hasConflict(1, '2026-05-05T09:00:00.000Z', '2026-05-05T10:00:00.000Z');
    expect(result).toBe(true);
  });
});

describe('Validation Helpers', () => {
  const { isValidDatetime, isValidDate } = require('../src/utils/validators');

  test('isValidDatetime accepts ISO strings', () => {
    expect(isValidDatetime('2026-05-05T09:00:00.000Z')).toBe(true);
    expect(isValidDatetime('2026-01-01T00:00:00Z')).toBe(true);
  });

  test('isValidDatetime rejects invalid strings', () => {
    expect(isValidDatetime('')).toBe(false);
    expect(isValidDatetime('not-a-date')).toBe(false);
    expect(isValidDatetime(null)).toBe(false);
    expect(isValidDatetime(undefined)).toBe(false);
  });

  test('isValidDate accepts YYYY-MM-DD', () => {
    expect(isValidDate('2026-05-05')).toBe(true);
    expect(isValidDate('2026-12-31')).toBe(true);
  });

  test('isValidDate rejects bad formats', () => {
    expect(isValidDate('05-05-2026')).toBe(false);
    expect(isValidDate('2026/05/05')).toBe(false);
    expect(isValidDate('')).toBe(false);
    expect(isValidDate(null)).toBe(false);
  });
});
