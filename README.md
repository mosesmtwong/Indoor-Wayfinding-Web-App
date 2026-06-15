# PathPal — Indoor Wayfinding + Desk Booking

This is my indoor wayfinding project. It started as a map-based navigation app where you can find stores inside a building, and now I've added a desk booking system on top of it. The whole thing runs locally — no cloud, no Firebase, just Node and SQLite on your machine.

## The idea

The app shows a 2-floor building as an SVG map. You can search for a store, and it draws the shortest path between two points. The pathfinding is server-side — the React app calls `GET /api/route` and renders the response. The new part is desk booking — there are 10 desks placed around the hallways on both floors, and you can click on them to book a time slot. Booked desks show up red on the map, available ones are green.

## How it works (the short version)

There are two parts:

- **Frontend** — React app with Vite. Renders the SVG map, handles navigation, and now also shows desks and lets you book them.
- **Backend** — Express server with SQLite. Manages desks and bookings, and runs the pathfinding algorithm. Has proper conflict checking so you can't double-book.

The frontend talks to the backend through a Vite proxy (basically `/api/something` in the frontend gets forwarded to `localhost:3001/something`). No hardcoded URLs.

**Pathfinding is server-side.** The shortest-path algorithm (Dijkstra) lives in the backend at `backend/src/services/routeService.js`. The React app does not bundle any pathfinding code — when you click a destination, the app calls `GET /api/route?start=...&end=...` and renders the JSON response (path, nodes with coordinates, distance, directions). This keeps the frontend bundle small and gives a single source of truth for the graph data.

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

### Pathfinding endpoints

The shortest-path algorithm is exposed as a public endpoint so other clients (e.g. a mobile app, a third-party web app) can reuse it.

**GET /api/route/vertices** — list all 26 vertices in the building graph (useful for building a UI without bundling the graph). Each vertex has an `id`, optional `objectName` (the human-readable store/room name), `floor`, and `cx`/`cy` coordinates in the SVG `viewBox 0 0 1200 800`.

**GET /api/route?start=<value>&end=<value>** — compute the shortest path between two points. Both `start` and `end` can be either a vertex id (e.g. `f1_v5`) or a store name (e.g. `Coffee Bean`); names are matched case-insensitively.

```bash
curl "http://localhost:3001/api/route?start=Coffee%20Bean&end=Cinema%20Hall"
```

Returns 200 with a route object:

```json
{
	"start": { "id": "f1_v1", "objectName": "Coffee Bean", "floor": 1 },
	"end": { "id": "f2_v1", "objectName": "Cinema Hall", "floor": 2 },
	"path": ["f1_v1", "f1_v5", "f1_v6", "f1_v7", "f1_v8", "f1_elev", "f2_elev", "f2_v8", "f2_v7", "f2_v6", "f2_v5", "f2_v1"],
	"nodes": [
		{ "id": "f1_v1", "objectName": "Coffee Bean", "floor": 1, "cx": 180, "cy": 200 },
		{ "id": "f1_v5", "objectName": null, "floor": 1, "cx": 180, "cy": 400 }
	],
	"distance": 2180,
	"crossesFloors": true,
	"floors": [1, 2],
	"directions": [
		{ "text": "Start at Coffee Bean", "floor": 1 },
		{ "text": "Take Elevator A to Floor 2", "floor": 1 },
		{ "text": "Arrive at Cinema Hall", "floor": 2 }
	]
}
```

Returns 400 if `start` or `end` is missing or unknown. The `nodes` array carries pre-resolved `cx`/`cy` coordinates so clients can draw the route on the same SVG floor plan without bundling the graph data themselves.

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

The API clients live in `src/utils/`:

- `bookingApi.ts` — fetch wrappers for the desk and booking endpoints
- `routeApi.ts` — fetch wrapper for the pathfinding endpoint (`GET /api/route`)
- `navigationHelper.ts` — coordinates route lookups, floor changes, and the on-map path rendering. The previous client-side Dijkstra has been moved to the backend; the frontend just parses the response and draws the line.

## Testing

```bash
cd backend
npm test
```

There are 28 tests covering:

- All the overlap scenarios for booking conflict detection (starts during, ends during, fully inside, fully contains, adjacent, different desk, cancelled bookings, exact same slot) — `tests/booking.test.js`
- Date and datetime validation helpers — `tests/booking.test.js`
- Graph data integrity, vertex lookup (by id and by name), same-floor routing, cross-floor routing through the elevator, and error responses for unknown inputs — `tests/route.test.js`

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
├── src/                          # frontend (React)
│   ├── pages/Map.tsx             # main page, sets up BookingContext
│   ├── store/graphData.ts        # static graph data used for rendering the map
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
│       ├── bookingApi.ts         # fetch calls to the booking endpoints
│       ├── routeApi.ts           # fetch calls to the pathfinding endpoint
│       ├── navigationHelper.ts   # async wrapper around /api/route, draws the SVG path
│       └── types.ts
│
├── backend/
│   ├── src/
│   │   ├── app.js                # express server, port 3001
│   │   ├── routes/               # endpoint definitions
│   │   │   ├── deskRoutes.js
│   │   │   ├── bookingRoutes.js
│   │   │   └── routeRoutes.js    # mounts GET /api/route and /api/route/vertices
│   │   ├── controllers/          # request handling + validation
│   │   │   ├── deskController.js
│   │   │   ├── bookingController.js
│   │   │   └── routeController.js
│   │   ├── services/             # database queries + business logic
│   │   │   ├── deskService.js
│   │   │   ├── bookingService.js
│   │   │   └── routeService.js   # server-side Dijkstra
│   │   ├── data/
│   │   │   └── graph.js          # the building graph (26 vertices, 25 edges)
│   │   ├── db/database.js        # sqlite setup
│   │   └── utils/validators.js
│   ├── tests/
│   │   ├── booking.test.js       # 14 booking/conflict tests
│   │   └── route.test.js         # 14 pathfinding tests
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
