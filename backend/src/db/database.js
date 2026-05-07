const Database = require('better-sqlite3');
const path = require('path');

// Store the database file in the project root
const DB_PATH = path.join(__dirname, '..', '..', 'desk_booking.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    // Enable WAL mode for better performance
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

// Create tables if they don't exist
function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS desks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      floor INTEGER NOT NULL,
      location TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      desk_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY (desk_id) REFERENCES desks(id)
    );
  `);

  console.log('Database initialized.');
  return db;
}

module.exports = { getDb, initDb };
