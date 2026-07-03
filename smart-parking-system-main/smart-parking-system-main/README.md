# ParKing

## Problem Statement

Urban areas face a growing challenge of inefficient parking management, leading to traffic congestion, fuel wastage, and driver frustration. **ParKing** is a smart-city application designed to manage parking zones, slots, sessions, and payments through a fully dynamic MongoDB-driven platform with role-based access for admins and customers.

### Goals

- Provide **real-time slot availability** across multiple parking zones.
- Enable **user registration and JWT authentication** with admin and customer roles.
- Track **parking sessions** (entry/exit) and compute duration and billing automatically.
- Process **payments** tied to each session.
- Support **role-based views**: admins manage infrastructure; customers start/end sessions and view their own records.

---

## Project Structure

```
smart-parking-system/
├── README.md                      # This file — project overview & problem statement
├── backend/                       # Node.js + Express + Mongoose API
│   ├── server.js                  # REST API routes, auth middleware, DB connection
│   ├── models.js                  # Mongoose schemas (User, Zone, Slot, Session, Payment)
│   └── package.json
├── frontend/                      # React + Vite frontend application
│   ├── src/
│   │   ├── components/            # Shared UI components (Navbar)
│   │   ├── context/               # AuthContext — JWT auth state management
│   │   ├── data/useData.js        # API data hook (fetch + refresh)
│   │   └── pages/                 # Login, Dashboard, Zones, Slots, Sessions, Payments, Users
│   ├── package.json
│   └── README.md                  # Frontend setup & usage instructions
├── docs/
│   ├── er_diagram.md              # Conceptual ER design (entities, attributes, relationships)
│   └── normalization_report.md    # 3NF normalization analysis for the reference SQL schema
├── sql/
│   ├── schema.sql                 # Reference relational schema — DDL with PKs, FKs, constraints
│   └── queries.sql                # Useful SQL queries (derived attributes, reports)
└── mongodb/
    └── schema.md                  # MongoDB document schema design with field definitions
```

---

## Collections Overview

| Collection  | Description                                                      |
|-------------|------------------------------------------------------------------|
| `users`     | Registered users (admin or customer role) with hashed passwords |
| `zones`     | Parking zones with location, capacity, and hourly rate          |
| `slots`     | Individual parking spaces within a zone                         |
| `sessions`  | Parking session records linking a vehicle to a slot             |
| `payments`  | Payment records linked 1:1 to parking sessions                  |

---

## Authentication

The API uses **JWT (JSON Web Token)** authentication:

- `POST /api/auth/register` — create a new customer account
- `POST /api/auth/login` — receive a JWT valid for 24 hours

Roles:
- **admin** — full access to zones, slots, all sessions and payments; user management
- **customer** — can start/end their own sessions and view their own sessions and payments

---

## Quick Start

### Backend (Node.js + Express + MongoDB)

> Requires [Node.js](https://nodejs.org/) v18+

Create a backend env file at `backend/.env`:

```
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
```

Then start the API server:

```bash
cd backend
npm install
npm start
```

The API runs on **http://localhost:5000**.

To seed the database with demo data (development only):

```bash
curl -X POST http://localhost:5000/api/seed
```

Default demo credentials after seeding: `admin / admin123` and `alice / customer123`.

### Frontend (React + Vite)

> Requires [Node.js](https://nodejs.org/) v18+

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser. See [`frontend/README.md`](frontend/README.md) for full details.

### SQL (Reference Schema)

The `sql/` directory contains a reference relational schema and example queries for documentation purposes. The application uses MongoDB as its primary database.

```bash
# Create reference schema (PostgreSQL)
psql -U postgres -d parking_db -f sql/schema.sql

# Run example queries
psql -U postgres -d parking_db -f sql/queries.sql
```

---

## Notes

- If you are using MongoDB Atlas, ensure your current IP is added to the Atlas Network Access allowlist.
- The frontend proxies `/api/*` to `http://localhost:5000` in development.
- The seed endpoint (`POST /api/seed`) is only available when `NODE_ENV` is `development` (or not set).

---

## Documentation

- **[ER Diagram & Conceptual Design](docs/er_diagram.md)** — Entity attributes and relationships for the actual MongoDB collections.
- **[Normalization Report](docs/normalization_report.md)** — Functional dependencies and 1NF → 3NF analysis for the reference SQL schema.
- **[MongoDB Schema Design](mongodb/schema.md)** — Document model with field definitions and design rationale.
