# ParKing — Frontend

A React + Vite single-page application providing a UI for **ParKing**.

## Features

- **Login** — JWT-based authentication with username/password
- **Role-based views** — admins and customers see different dashboards and actions
- **Dashboard (Admin)** — live summary stats and zone availability
- **Dashboard (Customer)** — quick access to start a new session
- **Zones (Admin)** — add, edit, and delete parking zones
- **Slots (Admin)** — view and manage parking slots with status badges
- **Sessions (Admin)** — full paginated session log with status
- **Sessions (Customer)** — start/end personal parking sessions
- **Payments (Admin)** — all payment records with status
- **Payments (Customer)** — personal payment history
- **Users (Admin)** — view all registered users
- Client-side routing via **React Router**
- Auth state management via `src/context/AuthContext.jsx`
- Live data via `src/data/useData.js` with refresh support

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later (LTS recommended)

## Quick Start

```bash
# from the repository root
cd frontend

npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Vite development server (HMR enabled) |
| `npm run build` | Produce a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Project Structure

```
frontend/
├── public/          # Static assets served as-is
├── src/
│   ├── components/
│   │   ├── Navbar.jsx           # Sticky top navigation bar
│   │   └── Navbar.css
│   ├── context/
│   │   └── AuthContext.jsx      # JWT auth state (login, logout, token storage)
│   ├── data/
│   │   └── useData.js           # API data hook (fetch + refresh)
│   ├── pages/
│   │   ├── Login.jsx            # Login form (shared entry point)
│   │   ├── Dashboard.jsx        # Admin overview stats
│   │   ├── CustomerDashboard.jsx# Customer home — start a new session
│   │   ├── Zones.jsx            # Admin: zone management
│   │   ├── Slots.jsx            # Admin: slot management
│   │   ├── Sessions.jsx         # Admin: all sessions log
│   │   ├── CustomerSessions.jsx # Customer: personal sessions (start/end)
│   │   ├── Payments.jsx         # Admin: all payment records
│   │   ├── CustomerPayments.jsx # Customer: personal payment history
│   │   └── Users.jsx            # Admin: registered users list
│   ├── App.jsx                  # Root component + React Router setup
│   ├── App.css
│   └── index.css                # Global styles
├── index.html
├── vite.config.js
└── package.json
```

## Connecting to a Real Backend

The app uses a built-in hook (`useData`) that calls `/api/*` endpoints. In development, Vite proxies `/api` to `http://localhost:5000` (see `vite.config.js`).

## Authentication Flow

1. User submits username and password on the Login page.
2. The backend returns a JWT and the user's role.
3. `AuthContext` stores the token in `localStorage` and provides it to all API requests via the `Authorization: Bearer <token>` header.
4. Protected routes redirect unauthenticated users to `/login`. Admin-only routes redirect non-admin users to `/`.
