const { initDb, getDb } = require('./src/db/database');

/**
 * Seed script — populates the database with 10 desks and sample bookings.
 * Desk coordinates are matched to the SVG viewBox (0 0 1200 800).
 * Run with: node seed.js
 */

function seed() {
  const db = initDb();

  // Clear existing data
  db.exec('DELETE FROM bookings');
  db.exec('DELETE FROM desks');
  db.exec("DELETE FROM sqlite_sequence WHERE name='desks'");
  db.exec("DELETE FROM sqlite_sequence WHERE name='bookings'");
  console.log('Cleared existing data.');

  // --- Insert 10 desks ---
  // Coordinates match the indoor map SVG (viewBox 0 0 1200 800)
  // Floor 1: 6 desks placed along hallways between stores
  // Floor 2: 4 desks placed along hallways between stores
  const desks = [
    // Floor 1 — upper hallway area (between top stores and hallway)
    { name: 'Desk-A1', floor: 1, location: JSON.stringify({ x: 295, y: 300 }) },
    { name: 'Desk-A2', floor: 1, location: JSON.stringify({ x: 525, y: 300 }) },
    { name: 'Desk-A3', floor: 1, location: JSON.stringify({ x: 755, y: 300 }) },
    // Floor 1 — lower hallway area (between hallway and bottom stores)
    { name: 'Desk-B1', floor: 1, location: JSON.stringify({ x: 295, y: 510 }) },
    { name: 'Desk-B2', floor: 1, location: JSON.stringify({ x: 525, y: 510 }) },
    { name: 'Desk-B3', floor: 1, location: JSON.stringify({ x: 755, y: 510 }) },
    // Floor 2 — upper hallway area
    { name: 'Desk-C1', floor: 2, location: JSON.stringify({ x: 295, y: 300 }) },
    { name: 'Desk-C2', floor: 2, location: JSON.stringify({ x: 525, y: 300 }) },
    // Floor 2 — lower hallway area
    { name: 'Desk-D1', floor: 2, location: JSON.stringify({ x: 295, y: 510 }) },
    { name: 'Desk-D2', floor: 2, location: JSON.stringify({ x: 525, y: 510 }) },
  ];

  const insertDesk = db.prepare('INSERT INTO desks (name, floor, location) VALUES (?, ?, ?)');

  for (const desk of desks) {
    insertDesk.run(desk.name, desk.floor, desk.location);
  }
  console.log(`Inserted ${desks.length} desks.`);

  // --- Insert sample bookings ---
  // Using today's date so the seed data is always relevant
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  const bookings = [
    {
      desk_id: 1,
      user_id: 'user-1',
      start_time: `${dateStr}T09:00:00.000Z`,
      end_time: `${dateStr}T11:00:00.000Z`,
    },
    {
      desk_id: 2,
      user_id: 'user-2',
      start_time: `${dateStr}T10:00:00.000Z`,
      end_time: `${dateStr}T12:00:00.000Z`,
    },
    {
      desk_id: 3,
      user_id: 'user-1',
      start_time: `${dateStr}T14:00:00.000Z`,
      end_time: `${dateStr}T16:00:00.000Z`,
    },
    {
      desk_id: 7,
      user_id: 'user-3',
      start_time: `${dateStr}T08:00:00.000Z`,
      end_time: `${dateStr}T09:30:00.000Z`,
    },
    {
      desk_id: 5,
      user_id: 'user-2',
      start_time: `${dateStr}T13:00:00.000Z`,
      end_time: `${dateStr}T15:00:00.000Z`,
    },
  ];

  const insertBooking = db.prepare(
    'INSERT INTO bookings (desk_id, user_id, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)'
  );

  for (const b of bookings) {
    insertBooking.run(b.desk_id, b.user_id, b.start_time, b.end_time, 'active');
  }
  console.log(`Inserted ${bookings.length} sample bookings.`);

  console.log('Seeding complete!');
}

seed();
