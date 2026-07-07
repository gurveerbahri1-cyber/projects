# HostGuard — Guest Rating Platform

A platform for Airbnb-style hosts to rate guests on cleanliness, property care,
rule compliance, communication, and house respect — with mutual blind reveal,
disputes, and moderation.

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%E2%89%A522.5-green)
![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)

## Repo Layout

```
docs/        Data model, ERD, and auth/identity-verification design docs
design/      React wireframes (host checkout report + guest stay record)
app/         Working local demo — zero dependencies, Node + node:sqlite
  ├── server.js     HTTP server + API routes
  ├── db.js         SQLite schema + seed data
  ├── auth.js       Password hashing (PBKDF2) + JWT (HMAC-SHA256)
  └── public/       Frontend (served as static files)
      ├── index.html
      ├── style.css
      └── app.js
```

## Quick Start

### Prerequisites

- **Node.js ≥ 22.5.0** (for built-in `node:sqlite` support)

### Run Locally

```bash
cd app
node server.js
```

Open [http://localhost:3000](http://localhost:3000) — no `npm install` needed.

### Demo Accounts

| Role | Email | Password |
|---|---|---|
| Host | `host@demo.com` | `password123` |
| Guest | `guest@demo.com` | `password123` |
| Moderator | `mod@demo.com` | `password123` |

A pre-completed booking is seeded automatically so you can try the review flow immediately.

### Deploy to Vercel

See [DEPLOY.md](./DEPLOY.md) for step-by-step instructions on deploying with Postgres.

## Where to Start

1. **Read the design first** — [`docs/guest-rating-schema.md`](./docs/guest-rating-schema.md) and
   [`docs/guest-rating-auth-and-verification.md`](./docs/guest-rating-auth-and-verification.md)
   explain the data model and auth approach.

2. **Run it locally** — `cd app && node server.js`. See [`app/README.md`](./app/README.md) for
   API endpoints and architecture details.

3. **Explore the design prototypes** — [`design/`](./design/) contains React wireframes showing
   the intended UX for the host checkout report and guest stay record flows.

4. **Deploy it** — Follow [`DEPLOY.md`](./DEPLOY.md) to go from local SQLite to Vercel + Postgres.

## Features

### Frontend (Host Dashboard)
- **Dashboard** — Stats overview, pending guests, recent reviews
- **Guest Directory** — Searchable table with property/status filters
- **Review System** — Multi-step modal: select guest → rate 6 categories → notes & tags → confirm
- **Analytics** — Radar chart, score distribution, timeline, top-rated guests
- **Responsive** — Mobile-friendly with collapsible sidebar
- **Dark Glassmorphism** — Premium aesthetic with gradients, blur effects, and micro-animations

### Backend API
- **Auth** — Signup/login with PBKDF2 password hashing + JWT tokens
- **Bookings** — Declare, confirm, and manage stays
- **Reviews** — Submit per-category scores with mutual blind reveal
- **Trust Scores** — Aggregated ratings per user per category
- **Disputes** — Raise, list, and resolve with moderator workflow
- **Zero Dependencies** — Uses only Node.js built-in modules

### Data Model
- 9 core tables with full relationship mapping
- Mutual reveal logic (sealed until both sides submit or 14 days pass)
- Score exclusion from aggregates when disputes are upheld
- Table-driven categories (no schema migration to add/retire)
- Comprehensive audit logging specification

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3 (vanilla), JavaScript (vanilla) |
| Backend | Node.js (built-in `http`, `crypto`, `sqlite`) |
| Database | SQLite (local) / Postgres (production) |
| Design Prototypes | React + TailwindCSS + Lucide Icons |
| Deployment | Vercel (serverless functions + edge CDN) |
| Auth | PBKDF2-SHA512 + HMAC-SHA256 JWT |

## Status

This is a working MVP, not a finished product. Known gaps:

- No moderator UI — dispute resolution is API-only
- No OAuth — email/password only
- No photo upload — just a boolean flag
- No device-fingerprinting for ban evasion
- Guest-side views exist only as React prototypes

All were deliberate scope cuts to get a working end-to-end loop first.

## License

MIT
