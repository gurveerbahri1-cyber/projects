# Local Demo — `app/`

A working local backend + frontend with **zero npm dependencies**. Uses only
Node.js built-in modules (`node:http`, `node:sqlite`, `node:crypto`).

## Requirements

- **Node.js ≥ 22.5.0** (for built-in `node:sqlite` support)

## Quick Start

```bash
cd app
node server.js
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

No `npm install` needed — there are no external dependencies.

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Host | `host@demo.com` | `password123` |
| Guest | `guest@demo.com` | `password123` |
| Moderator | `mod@demo.com` | `password123` |

A pre-completed booking between the host and guest is seeded automatically,
so you can try the review flow immediately after login.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register a new account |
| POST | `/api/auth/login` | Log in, receive a JWT |
| GET | `/api/me` | Get current authenticated user |
| GET | `/api/categories` | List rating categories |
| GET | `/api/bookings/mine` | List your bookings |
| POST | `/api/bookings` | Host declares a new booking |
| POST | `/api/bookings/:id/confirm` | Guest confirms a booking |
| POST | `/api/bookings/:id/reviews` | Submit a review (5 category scores) |
| GET | `/api/users/:id/trust-scores` | Get a user's aggregate trust scores |
| POST | `/api/review-scores/:id/disputes` | Raise a dispute on a score |
| GET | `/api/disputes` | List open disputes (moderator only) |
| POST | `/api/disputes/:id/resolve` | Resolve a dispute (moderator only) |

## Architecture

```
app/
├── server.js      # HTTP server, routing, API handlers, static file serving
├── db.js          # SQLite schema creation + seed data
├── auth.js        # Password hashing (PBKDF2) + JWT (HMAC-SHA256)
├── package.json   # Zero dependencies, just metadata
└── public/        # Static frontend (served at /)
    ├── index.html
    ├── style.css
    └── app.js
```

## Known Gaps

- No moderator UI — dispute resolution is API-only (use curl or Postman)
- No OAuth — email/password only
- No photo upload — just a boolean `has_evidence` flag
- No device-fingerprinting for ban evasion
- SQLite is file-based — not suitable for serverless deployment (see `../DEPLOY.md`)
