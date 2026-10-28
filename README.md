# PlacementTrack

A full-stack web app for campus placements. Students find company drives they're eligible for, apply in one click, track every application on a Kanban board, and prepare with AI: a resume review, a fit check for each role and mock interviews built from the job posting. The placement officer posts drives, moves applicants through each round, posts announcements, runs the offer policy and follows the season on a stats dashboard.

**Live API:** https://placement-track-do7x.onrender.com/api/health (free tier: the first request after a quiet spell can take up to a minute while the server wakes up).

## Features

### Students
- **Accounts and onboarding:** register and log in (JWT), then a short onboarding wizard (skills, interests, target roles, locations, job type, expected package) that powers match scores
- **Drives:** search and filter open campus drives, ranked by a **match score** with reasons ("3 of 4 skills match", "Fits your Software Engineer goal"), tier badges and an Eligible / Not eligible badge
- **Drive details:** eligibility checklist (CGPA, branch, graduation year, backlogs, placement policy), deadline countdown, one-click apply with clear reasons when applying isn't possible
- **Kanban tracker:** Applied → Aptitude Test → Interview → Offer / Rejected, with a stage timeline and private prep notes per application
- **Announcements:** notices from the placement cell on the dashboard, and drive-specific updates on the drives they applied to
- **Reminders and calendar:** deadline reminders for eligible drives not yet applied to, upcoming drive days, and an `.ics` export for Google or Apple Calendar
- **Jobs:** live openings from across India (Adzuna), separate from campus drives, scored with the same match engine
- **My profile:** academic details, contact details, resume upload (PDF or JPG), career preferences, placement status and a profile-strength checklist
- **AI Resume Coach:** a score out of 100, sub-scores, line-by-line fixes with rewritten bullets, gaps for target roles, and skills the resume proves that the profile is missing (added in one tap, so match scores update)
- **How do I fit?:** for any drive or job, a fit score, gaps with how to close them, tailored resume bullets and interview talking points
- **AI mock interviews:** five questions written from the job posting and the resume (technical deep-dives, a scenario, a project question and a behavioural question), pitched at the company's level. Answer by typing or dictating, then get a graded report: score, verdict ("Likely to clear this round" / "Borderline" / "Not ready yet"), whether you'd be good for the role, competency scores, feedback on each answer with what a strong answer covers, and next steps
- Mobile-first, accessible UI with **light and dark themes**

### Placement officer
- Separate officer login
- Create, edit, close and delete drives (company, role, package, skills, eligibility, deadline, drive date), with a live student preview
- **Applicants:** filter by stage, search, move applicants through valid stages with remarks, **bulk shortlist** by selection or by pasting roll numbers, view resumes and **download all resumes as one ZIP**
- **Students directory:** every student with search and filters (branch, graduation year, minimum CGPA, placed / not placed, resume uploaded) and season totals, plus each student's profile and applications
- **Announcements:** post to every student, or to one drive's applicants at chosen stages (e.g. only those in the interview round)
- **Placement policy:** drives are tiered Regular / Dream / Super Dream by package (cutoffs set by the officer). A student with a full-time offer can only apply to higher-tier drives; Super Dream holders are done; internships are never limited
- **Dashboard:** students, open drives, applications, students placed, placement rate, package stats, stage and branch breakdowns, and a **placement funnel** showing where students drop off

## Tech stack

| Layer | Tech |
|---|---|
| Client | React 18, Vite, React Router, Axios, CSS design tokens |
| Server | Node.js 20+, Express 4, Zod validation |
| Database | MongoDB, Mongoose 8 |
| Auth | JWT with roles (`student`, `admin`), bcrypt, rate limiting |
| AI | Groq-hosted LLM (`openai/gpt-oss-120b`) with JSON-schema output; resume text extracted with `unpdf` |
| Job listings | Adzuna API, cached in MongoDB for 6 hours |
| Testing | Jest + Supertest on an in-memory MongoDB (external APIs faked), Postman and Thunder Client collections |
| Hosting | Vercel (client), Render (API), MongoDB Atlas |

## Documentation

| Doc | What's inside |
|---|---|
| [Requirements](docs/requirements.md) | User stories with acceptance criteria, non-functional requirements |
| [Architecture](docs/architecture.md) | Folder layout, request flow, client routing, shared interfaces |
| [Database schema](docs/database-schema.md) | Models, indexes, relationships |
| [API contract](docs/api-contract.md) | **Every endpoint**: method, path, role, request, response, errors |
| [UI design](docs/ui-design.md) | Design tokens, wireframes, component states, accessibility checklist |
| [Postman collection](docs/postman/PlacementTrack.postman_collection.json) | Import into Postman to try the API |
| [Thunder Client collection](docs/thunder/placement-track-jobs.postman_collection.json) | Job search requests for VS Code (Thunder Client → Import → Postman) |
| [Deployment](docs/deployment.md) | MongoDB Atlas, Render (API) and Vercel (client) step by step |

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
cp .env.example .env          # then edit MONGO_URI and JWT_SECRET (and the optional keys below)
npm install
npm run dev                   # http://localhost:5050/api/health -> {"status":"ok"}

# Client (new terminal)
cd client
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173
```

The API uses port **5050** because macOS uses 5000 for AirPlay.

### Optional keys (`server/.env`)

The app runs without these; the matching features show a friendly "not set up yet" message instead.

| Key | Turns on | Get it |
|---|---|---|
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | Jobs tab (outside listings) | Free at [developer.adzuna.com](https://developer.adzuna.com) |
| `GROQ_API_KEY` | Resume Coach, How do I fit?, mock interviews | Free at [console.groq.com/keys](https://console.groq.com/keys) |
| `GROQ_MODEL` | Which Groq model to use (default `openai/gpt-oss-120b`) | |

The AI features send the student's resume text and profile to Groq. They read **PDF** resumes; a JPG or a scanned PDF has no text to read, so students are asked to upload a text PDF.

### Demo data

`cd server && npm run seed` **wipes your local database** and loads demo students, drives and applications. Then log in as:

| Role | Email | Password |
|---|---|---|
| Officer (`/admin/login`) | `officer@college.edu` | `ADMIN_SEED_PASSWORD` from `server/.env` |
| Student (`/login`) | `asha@college.edu` (or any seeded student) | `Student@123` |

### Scripts

| Where | Command | Does |
|---|---|---|
| server | `npm run dev` | Start API with auto-reload (nodemon) |
| server | `npm start` | Start API |
| server | `npm test` | Run Jest + Supertest tests (in-memory MongoDB, no setup or API keys needed) |
| server | `npm run test:coverage` | Tests with a coverage report |
| server | `npm run seed` | Reset local DB with demo data |
| server | `npm run seed:admin` | Create/update only the officer account (safe in production) |
| client | `npm run dev` | Start Vite dev server (proxies `/api` to `:5050`) |
| client | `npm run build` | Production build to `client/dist` |

## Deployment

Client on **Vercel**, API on **Render**, database on **MongoDB Atlas**. Both Vercel and Render deploy the `main` branch: Render builds only `server/`, Vercel builds only `client/`. Set `ADZUNA_*` and `GROQ_API_KEY` in Render's environment to turn on the Jobs and AI features. See [docs/deployment.md](docs/deployment.md).

## Project structure

```
placement-track/
├── client/          React app (pages, components, services, context, styles)
├── server/          Express API (config, models, controllers, routes, middleware, validators, utils, tests)
├── docs/            Requirements, architecture, schema, API contract, UI design, Postman and Thunder Client
└── .github/         PR template, issue templates, CODEOWNERS
```
See [architecture.md](docs/architecture.md#3-folder-layout) for the full tree.

## Team

| Member | GitHub | Responsibility |
|---|---|---|
| Raghav | [@Raghavnv](https://github.com/Raghavnv) | Express API, models, JWT auth and roles, drives and applications, validation and tests; onboarding and match scores; Jobs (Adzuna); My profile; AI Resume Coach, How do I fit? and mock interviews (Groq); placement policy |
| Teammate 1 | [@Puneethbin](https://github.com/Puneethbin) | Student register/login, drive listing and details, apply, Kanban tracker, notes, deadline reminders, responsive CSS |
| Teammate 2 | [@pranavmohan10-kaizen](https://github.com/pranavmohan10-kaizen) | Admin login, drive create/edit/delete, applicants table and stage updates, stats dashboard, shared layout and routing; resume upload and officer resume view, ZIP download, bulk shortlisting, students directory, announcements |

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before your first commit. In short: never commit to `main`, work on your own feature branch, merge `main` in daily, and open a PR into `main` with one review.
