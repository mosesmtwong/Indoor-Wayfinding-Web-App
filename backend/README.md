# Desk Booking Backend

On-premise desk booking API for the Indoor Wayfinding system. Runs fully locally with no cloud dependencies.

## Tech Stack

- **Node.js** + **Express** — REST API
- **SQLite** (via `better-sqlite3`) — local database
- **Jest** — unit testing

## Project Structure

```
backend/
├── src/
│   ├── app.js              # Express server entry point
│   ├── routes/
│   │   ├── deskRoutes.js    # Desk API routes
│   │   └── bookingRoutes.js # Booking API routes
│   ├── controllers/
│   │   ├── deskController.js
│   │   └── bookingController.js
│   ├── services/
│   │   ├── deskService.js   # Desk database queries
│   │   └── bookingService.js # Booking queries + conflict logic
│   ├── db/
│   │   └── database.js      # SQLite setup + init
│   └── utils/
│       └── validators.js    # Input validation helpers
├── tests/
│   └── booking.test.js      # Unit tests for conflict logic
├── seed.js                  # Database seeding script
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

## Quick Start

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Seed the database

This creates 10 desks and 5 sample bookings:

```bash
npm run seed
```

### 3. Start the server

```bash
npm start
# or for development with auto-reload:
npm run dev
```

The API will be available at `http://localhost:3001`.

---

## API Documentation

### Health Check

```
GET /api/health
```

Response:
```json
{ "status": "ok", "timestamp": "2026-05-04T12:00:00.000Z" }
```

---

### Get All Desks

```
GET /api/desks
```

Returns all desks with dynamically computed availability (based on current time).

**Example:**
```bash
curl http://localhost:3001/api/desks
```

**Response:**
```json
{
  "desks": [
    {
      "id": 1,
      "name": "Desk-A1",
      "floor": 1,
      "location": "{\"x\":100,\"y\":150}",
      "status": "booked"
    },
    {
      "id": 2,
      "name": "Desk-A2",
      "floor": 1,
      "location": "{\"x\":200,\"y\":150}",
      "status": "available"
    }
  ]
}
```

---

### Get Desk Availability

```
GET /api/desks/:id/availability?date=YYYY-MM-DD
```

Returns 30-minute time slots (8:00 AM to 6:00 PM) with availability.

**Example:**
```bash
curl "http://localhost:3001/api/desks/1/availability?date=2026-05-05"
```

**Response:**
```json
{
  "desk_id": 1,
  "desk_name": "Desk-A1",
  "date": "2026-05-05",
  "slots": [
    { "start": "2026-05-05T08:00:00.000Z", "end": "2026-05-05T08:30:00.000Z", "available": true },
    { "start": "2026-05-05T08:30:00.000Z", "end": "2026-05-05T09:00:00.000Z", "available": true },
    { "start": "2026-05-05T09:00:00.000Z", "end": "2026-05-05T09:30:00.000Z", "available": false }
  ]
}
```

---

### Create a Booking

```
POST /api/bookings
Content-Type: application/json
```

**Body:**
```json
{
  "desk_id": 1,
  "user_id": "user-1",
  "start_time": "2026-05-06T09:00:00.000Z",
  "end_time": "2026-05-06T11:00:00.000Z"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"desk_id": 1, "user_id": "user-1", "start_time": "2026-05-06T09:00:00.000Z", "end_time": "2026-05-06T11:00:00.000Z"}'
```

**Success (201):**
```json
{
  "message": "Booking created",
  "booking": {
    "id": 6,
    "desk_id": 1,
    "user_id": "user-1",
    "start_time": "2026-05-06T09:00:00.000Z",
    "end_time": "2026-05-06T11:00:00.000Z",
    "status": "active",
    "desk_name": "Desk-A1",
    "floor": 1
  }
}
```

**Conflict (409):**
```json
{ "error": "Booking conflict: this desk is already booked for the requested time" }
```

**Validation errors return 400.**

---

### Cancel a Booking

```
DELETE /api/bookings/:id
```

**Example:**
```bash
curl -X DELETE http://localhost:3001/api/bookings/1
```

**Response:**
```json
{ "message": "Booking cancelled successfully" }
```

---

### Get My Bookings

```
GET /api/bookings/me?user_id=user-1
```

**Example:**
```bash
curl "http://localhost:3001/api/bookings/me?user_id=user-1"
```

**Response:**
```json
{
  "bookings": [
    {
      "id": 1,
      "desk_id": 1,
      "user_id": "user-1",
      "start_time": "2026-05-04T09:00:00.000Z",
      "end_time": "2026-05-04T11:00:00.000Z",
      "status": "active",
      "desk_name": "Desk-A1",
      "floor": 1
    }
  ]
}
```

---

## Seeding

The seed script (`seed.js`) populates the database with:

- **10 desks**: 6 on Floor 1 (Desk-A1 through Desk-B3), 4 on Floor 2 (Desk-C1 through Desk-D2)
- **5 sample bookings**: Using today's date so they're always relevant

Each desk has an (x, y) location stored as a JSON string, suitable for SVG-based floor plan rendering.

Running `npm run seed` will **clear all existing data** and re-insert the seed data.

---

## Running Tests

```bash
npm test
```

Tests cover:
- All booking conflict overlap scenarios (start during, end during, fully inside, fully contains)
- Edge cases (adjacent bookings, cancelled bookings, different desks)
- Input validation helpers

---

## Docker

### Build and run with Docker Compose

```bash
docker-compose up --build
```

### Or build and run manually

```bash
docker build -t desk-booking .
docker run -p 3001:3001 desk-booking
```

The container will automatically seed the database and start the server.

---

## Design Decisions

- **Desk status is computed, not stored**: The `desks` table doesn't have a `status` column. Availability is calculated dynamically from active bookings at query time, preventing stale data.
- **Conflict detection**: Uses the standard interval overlap formula: `startA < endB AND endA > startB`.
- **SQLite**: Chosen for zero-config, on-premise operation. The DB file is stored at `backend/desk_booking.db`.
- **No authentication**: Users are identified by a simple `user_id` string (e.g., "user-1"). This is intentional for a local/internal system.
