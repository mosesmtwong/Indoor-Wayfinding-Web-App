# PathPal — Indoor Wayfinding + Desk Booking

This is my indoor wayfinding project. It started as a map-based navigation app where you can find stores inside a building, and now I've added a desk booking system on top of it. The whole thing runs locally — no cloud, no Firebase, just Node and SQLite on your machine.

## The idea

The app shows a 2-floor building as an SVG map. You can search for a store, and it draws the shortest path using Dijkstra's algorithm. The new part is desk booking — there are 10 desks placed around the hallways on both floors, and you can click on them to book a time slot. Booked desks show up red on the map, available ones are green.

## How it works (the short version)

There are two parts:

- **Frontend** — React app with Vite. Renders the SVG map, handles navigation, and now also shows desks and lets you book them.
- **Backend** — Express server with SQLite. Manages desks and bookings. Has proper conflict checking so you can't double-book.

The frontend talks to the backend through a Vite proxy (basically `/api/something` in the frontend gets forwarded to `localhost:3001/something`). No hardcoded URLs.

## Getting it running

You need two terminals open.

**Terminal 1 — backend:**
```bash
cd backend
npm install
npm run seed     # sets up the database with 10 desks and some sample bookings
npm start        # runs on port 3001
```

**Terminal 2 — frontend:**
```bash
npm install      # from the root folder
npm run dev      # runs on port 5173
```

Then open http://localhost:5173 and you should see the map with desk markers on it.

## Database

I went with SQLite because it's just a single file, no setup needed. The DB has two tables:

**desks:**
- `id` — auto increment
- `name` — like "Desk-A1", "Desk-B2", etc.
- `floor` — 1 or 2
- `location` — JSON string with x,y coords that match the SVG map

**bookings:**
- `id` — auto increment
- `desk_id` — which desk (foreign key)
- `user_id` — just a string like "user-1" (no real auth)
- `start_time` — ISO datetime
- `end_time` — ISO datetime
- `status` — "active" or "cancelled"

One thing worth mentioning — the desks table doesn't have a `status` column. I compute availability on the fly by checking if there's an active booking for the current time. This way the status is always accurate and I don't have to worry about keeping it in sync.

## API endpoints

Here's what the backend exposes:

**GET /api/desks** — gives you all 10 desks with their current status (available or booked)

**GET /api/desks/:id/availability?date=2026-05-07** — returns 30-min time slots from 8am to 6pm for that desk on that day, each marked as available or not

**POST /api/bookings** — book a desk. Send JSON like:
```json
{
  "desk_id": 4,
  "user_id": "user-1",
  "start_time": "2026-05-08T09:00:00.000Z",
  "end_time": "2026-05-08T11:00:00.000Z"
}
```
Returns 201 if it worked, 409 if there's a conflict, 400 if validation fails.

**DELETE /api/bookings/:id** — cancels a booking (doesn't delete it, just sets status to "cancelled")

**GET /api/bookings/me?user_id=user-1** — get all bookings for a user

## Conflict detection

This is the part I'm most happy with honestly. Two bookings overlap if:
```
startA < endB AND endA > startB
```
So if someone has Desk-A1 booked 9:00-11:00 and you try to book 10:00-12:00, it catches that. It also handles the edge cases — if one booking ends at exactly 10:00 and another starts at 10:00, that's fine, no conflict. Cancelled bookings are ignored too.

## Validation

The backend checks for:
- All fields present (desk_id, user_id, start_time, end_time)
- Valid datetime format
- start_time actually comes before end_time
- The desk actually exists
- No time conflicts with existing bookings

Each of these returns a proper error message and the right HTTP status code (400, 404, or 409).

## Frontend stuff

On the React side, I added:

- **Desk markers on the map** — small green/red pills on the SVG that show desk names. Green = available, red = booked. They pulse a little when available.
- **Booking dialog** — click a desk (on the map or sidebar) and a modal pops up. Pick a date, pick a time slot from the grid, hit Book.
- **Sidebar tabs** — the sidebar now has "Places" and "Desks" tabs. Places is the original store list. Desks shows all desks grouped by floor + a "My Bookings" section where you can cancel stuff.
- **Auto-refresh** — the app polls the backend every 30 seconds so desk colors stay up to date.

The API client is in `src/utils/bookingApi.ts` — it's just fetch wrappers, nothing fancy.

## Testing

```bash
cd backend
npm test
```

There are 14 tests covering:
- All the overlap scenarios for conflict detection (starts during, ends during, fully inside, fully contains, adjacent, different desk, cancelled bookings, exact same slot)
- Date and datetime validation helpers

Tests use an in-memory SQLite database so they're fast and don't mess with real data.

## Docker

There's a Dockerfile and docker-compose in the backend folder if you want to run it in a container:

```bash
cd backend
docker-compose up --build
```

It'll build the image, seed the DB, and start the server on port 3001. The database file is in a Docker volume so it persists across restarts.

## Seeding

`npm run seed` in the backend folder wipes the database and inserts:
- 10 desks (6 on floor 1, 4 on floor 2)
- 5 sample bookings using today's date

The desk coordinates match the SVG viewBox so they show up in the right spots on the map.

## Project structure

```
track/
├── src/                          # frontend (React)
│   ├── pages/Map.tsx             # main page, sets up BookingContext
│   ├── components/
│   │   ├── IndoorMap/
│   │   │   ├── DeskMarkers.tsx   # the green/red desk pills on the SVG
│   │   │   ├── Objects.tsx       # store rectangles
│   │   │   └── ...
│   │   ├── BookingDialog.tsx     # time slot picker modal
│   │   ├── BookingPanel.tsx      # desk list + my bookings (sidebar)
│   │   ├── Sidebar.tsx           # Places/Desks tabs
│   │   └── IndoorMapWrapper.tsx  # puts everything together on the SVG
│   └── utils/
│       ├── bookingApi.ts         # fetch calls to the backend
│       └── types.ts
│
├── backend/
│   ├── src/
│   │   ├── app.js                # express server, port 3001
│   │   ├── routes/               # endpoint definitions
│   │   ├── controllers/          # request handling + validation
│   │   ├── services/             # database queries + business logic
│   │   ├── db/database.js        # sqlite setup
│   │   └── utils/validators.js
│   ├── tests/booking.test.js     # jest tests
│   ├── seed.js
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── package.json
│
├── vite.config.ts                # has the /api proxy to backend
└── package.json
```

## Tech used

- React 18 + TypeScript + Vite (frontend)
- Tailwind CSS (styling)
- Node.js + Express (backend)
- SQLite via better-sqlite3 (database)
- Jest (testing)
- Docker (optional deployment)

## Things I'd add if I had more time

- WebSockets instead of polling so desk status updates instantly
- Actual login/JWT auth instead of mock user IDs
- Rate limiting on the booking endpoint
- Recurring bookings (like "every Monday 9-11")
- Better mobile layout for the booking panel

## Some notes on stuff that tripped me up

1. **Drawing the path per-floor** was a bit tricky. The original code drew the entire route as one SVG path, but with multi-floor you only want to show the segment for the current floor. I ended up filtering the path nodes by floor before drawing, and added a small timeout when switching floors so the SVG has time to re-render before we draw on it (felt hacky but it works).

2. **Elevator weight tuning** — I wasn't sure what cost to give the elevator edge. Too low and the algorithm would route through it unnecessarily, too high and it would never use it. Settled on a fixed weight of 50 which seems to work fine for the map scale I'm using.

3. **Desk status being computed vs stored** — I almost added a `status` column to the desks table and tried to keep it in sync. Then I realized that's a pain and error-prone, so I just check the bookings table every time someone asks for desk status. Adds a tiny bit of query overhead but the data is always correct.
