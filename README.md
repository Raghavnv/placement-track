# PlacementTrack

A full-stack web app for campus placements. Students find company drives they're eligible for, apply in one click, and track each application on a Kanban board. The placement officer posts drives, moves applicants through each round, and follows the season on a stats dashboard.

> **Status:** project scaffold. Features are being built on three feature branches; see [Team](#team) and the [issues](../../issues).

## Features

### Student
- Register and log in (JWT); eligibility is calculated from CGPA, branch, backlogs and graduation year
- Browse open drives with search and filters, and an "Eligible / Not eligible" badge on each
- Drive details with an eligibility checklist and deadline countdown
- One-click apply, with clear reasons when applying is not possible
- **Kanban tracker**: Applied → Aptitude Test → Interview → Offer / Rejected, with a stage timeline
- Private **prep notes** per application
- **Deadline reminders** for eligible drives not yet applied to, plus upcoming drive dates
- Mobile-first, accessible UI

### Admin (Placement Officer)
- Separate officer login
- Create, edit, close and delete drives (company, role, package, eligibility, deadline, drive date)
- Applicants per drive: filter by stage, search, and move applicants through valid stages with remarks
- Dashboard: students, open drives, applications, students placed, placement rate, package stats, stage and branch breakdowns

## Tech stack

| Layer | Tech |
|---|---|
| Client | React 18, Vite, React Router, Axios, CSS design tokens |
| Server | Node.js 20+, Express 4 |
| Database | MongoDB, Mongoose 8 |
| Auth | JWT with roles (`student`, `admin`), bcrypt |
| Testing | Jest + Supertest, Postman |

## Documentation

| Doc | What's inside |
|---|---|
| [Requirements](docs/requirements.md) | User stories with acceptance criteria, non-functional requirements |
| [Architecture](docs/architecture.md) | Folder layout, request flow, client routing, shared interfaces |
| [Database schema](docs/database-schema.md) | User, Drive, Application models, indexes, relationships |
| [API contract](docs/api-contract.md) | **Every endpoint**: method, path, role, request, response, errors |
| [UI design](docs/ui-design.md) | Design tokens, wireframes, component states, accessibility checklist |
| [Postman collection](docs/postman/PlacementTrack.postman_collection.json) | Import into Postman to try the API |

## Getting started

### Prerequisites
- Node.js 20 or newer (`node -v`)
- MongoDB, either local (`brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- Git

### Setup

```bash
git clone https://github.com/Raghavnv/placement-track.git
cd placement-track

# Server
cd server
cp .env.example .env          # then edit MONGO_URI and JWT_SECRET
npm install
npm run dev                   # http://localhost:5050/api/health -> {"status":"ok"}

# Client (new terminal)
cd client
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173
```

### Scripts

| Where | Command | Does |
|---|---|---|
| server | `npm run dev` | Start API with auto-reload (nodemon) |
| server | `npm start` | Start API |
| server | `npm test` | Run Jest + Supertest tests |
| client | `npm run dev` | Start Vite dev server (proxies `/api` to `:5050`) |
| client | `npm run build` | Production build to `client/dist` |

## Project structure

```
placement-track/
├── client/          React app (pages, components, services, context, styles)
├── server/          Express API (config, models, controllers, routes, middleware, tests)
├── docs/            Requirements, architecture, schema, API contract, UI design, Postman
└── .github/         PR template, issue templates, CODEOWNERS
```
See [architecture.md](docs/architecture.md#3-folder-layout) for the full tree.

## Team

| Member | GitHub | Branch | Responsibility |
|---|---|---|---|
| Raghav | [@Raghavnv](https://github.com/Raghavnv) | `feature/backend-api` | Express server, Mongoose models, JWT auth and role middleware, drives and applications endpoints, validation, error handling, Jest tests |
| Teammate 1 | [@Puneethbin](https://github.com/Puneethbin) | `feature/student-ui` | Student register/login, drive listing and details, apply, Kanban tracker, notes, deadline reminders, responsive CSS |
| Teammate 2 | [@pranavmohan10-kaizen](https://github.com/pranavmohan10-kaizen) | `feature/admin-ui` | Admin login, drive create/edit/delete, applicants table with stage updates, stats dashboard, shared layout, routing and protected routes |

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before your first commit. In short: never commit to `main`, work on your own branch, merge `main` in daily, and open a PR with one review.
