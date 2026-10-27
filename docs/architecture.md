# Architecture

## 1. Stack

| Layer | Technology | Why |
|---|---|---|
| Client | React 18 + Vite | Fast dev server, simple build |
| Routing | React Router v6 | Nested and protected routes |
| HTTP client | Axios | Interceptors for the token and errors |
| State | React Context (auth) + local component state | Enough for this size; no Redux needed |
| Styling | Plain CSS with design tokens (`client/src/styles/tokens.css`) | No framework lock-in; see `ui-design.md` |
| Server | Node.js 20+ + Express 4 | |
| Database | MongoDB + Mongoose 8 | |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` | Stateless, role in token |
| Testing | Jest + Supertest (API); Postman collection (manual) | |

## 2. High-level diagram

```
┌──────────────────────────┐   HTTPS / JSON    ┌─────────────────────────────┐     Mongoose     ┌────────────┐
│  React SPA (Vite)        │ ───────────────▶  │  Express API                │ ───────────────▶ │  MongoDB   │
│  - Student pages         │  Authorization:   │  routes → middleware →      │                  │  users     │
│  - Admin pages           │  Bearer <JWT>     │  controllers → models       │ ◀─────────────── │  drives    │
│  - AuthContext + axios   │ ◀───────────────  │  central error handler      │                  │  applica-  │
└──────────────────────────┘                   └─────────────────────────────┘                  │  tions     │
       :5173 (dev)                                     :5000                                    └────────────┘
```

In development, Vite proxies `/api/*` to `http://localhost:5000`, so the client always calls relative `/api/...` URLs.

## 3. Folder layout

```
placement-track/
├── client/                         # React (Vite) app
│   ├── index.html
│   ├── vite.config.js              # dev proxy /api -> :5000
│   └── src/
│       ├── main.jsx                # entry; imports tokens.css + global.css
│       ├── App.jsx                 # router (admin-ui owns)
│       ├── styles/                 # tokens.css, global.css (shared, change via PR)
│       ├── services/               # api.js (axios instance), auth/drive/application services
│       ├── context/                # AuthContext.jsx
│       ├── hooks/                  # useAuth, useFetch, useDebounce ...
│       ├── utils/                  # formatDate, formatPackage, stage constants
│       ├── components/
│       │   ├── layout/             # AppShell, Navbar, Sidebar, ProtectedRoute   (admin-ui)
│       │   ├── common/             # Button, Input, Modal, Toast, Badge, EmptyState, Spinner (shared)
│       │   ├── student/            # DriveCard, KanbanBoard, KanbanColumn, NotesEditor, ReminderPanel (student-ui)
│       │   └── admin/              # DriveForm, ApplicantsTable, StageSelect, StatCard, charts (admin-ui)
│       └── pages/
│           ├── auth/               # LoginPage, RegisterPage (student-ui), AdminLoginPage (admin-ui)
│           ├── student/            # DashboardPage, DrivesPage, DriveDetailsPage, ApplicationsPage
│           └── admin/              # AdminDashboardPage, ManageDrivesPage, DriveFormPage, ApplicantsPage
├── server/
│   └── src/
│       ├── server.js               # loads env, connects DB, starts listening
│       ├── app.js                  # express app (exported for Supertest)
│       ├── config/                 # db.js (mongoose.connect), env checks
│       ├── models/                 # User.js, Drive.js, Application.js
│       ├── controllers/            # authController, driveController, applicationController, adminController
│       ├── routes/                 # authRoutes, driveRoutes, applicationRoutes, adminRoutes
│       ├── middleware/             # auth.js (protect), requireRole.js, validate.js, errorHandler.js, notFound.js
│       ├── utils/                  # ApiError.js, asyncHandler.js, stages.js, eligibility.js, seed.js
│       └── tests/                  # *.test.js (Jest + Supertest)
└── docs/                           # requirements, architecture, schema, API contract, UI design, Postman
```

## 4. Server request flow

```
Request
  → cors, express.json()
  → router (/api/auth | /api/drives | /api/applications | /api/admin)
  → protect          # verifies JWT, loads req.user (401 if missing/invalid)
  → requireRole('admin' | 'student')   # 403 if wrong role
  → validate(schema) # 400 VALIDATION_ERROR with details[]
  → controller       # business logic; throws ApiError(status, code, message)
  → res.json(...)
Errors from any step → errorHandler → { error: { code, message, details? } }
```

Conventions:
- Controllers never call `res.status(500)` themselves. They `throw new ApiError(...)` or let the error bubble up through `asyncHandler`.
- Mongoose `CastError` → `400 INVALID_ID`; `ValidationError` → `400 VALIDATION_ERROR`; duplicate key `11000` → `409`.
- Stage rules live in `utils/stages.js`; eligibility rules live in `utils/eligibility.js` (a pure function, unit-tested).
- Tests import `app.js` (not `server.js`) and use a separate test database (`MONGO_URI` ending in `-test`, or `mongodb-memory-server` if the backend owner adds it).

## 5. Client architecture

### 5.1 Routing

| Path | Page | Guard | Owner |
|---|---|---|---|
| `/` | Redirect to `/student` or `/admin` by role, else `/login` | | admin-ui |
| `/login` | LoginPage | public-only | student-ui |
| `/register` | RegisterPage | public-only | student-ui |
| `/admin/login` | AdminLoginPage | public-only | admin-ui |
| `/student` | DashboardPage (reminders + summary) | student | student-ui |
| `/student/drives` | DrivesPage | student | student-ui |
| `/student/drives/:id` | DriveDetailsPage | student | student-ui |
| `/student/applications` | ApplicationsPage (Kanban + notes drawer) | student | student-ui |
| `/admin` | AdminDashboardPage (stats) | admin | admin-ui |
| `/admin/drives` | ManageDrivesPage | admin | admin-ui |
| `/admin/drives/new` | DriveFormPage | admin | admin-ui |
| `/admin/drives/:id/edit` | DriveFormPage | admin | admin-ui |
| `/admin/drives/:id/applicants` | ApplicantsPage | admin | admin-ui |
| `*` | NotFoundPage | | admin-ui |

`ProtectedRoute` (admin-ui) usage:
```jsx
<Route element={<ProtectedRoute role="student" />}>
  <Route element={<AppShell variant="student" />}>
    <Route path="/student" element={<DashboardPage />} />
    ...
  </Route>
</Route>
```
Behaviour: while auth is loading, show a full-page spinner. If not logged in, redirect to the right login page and keep `state.from` so the user returns after login. If the role is wrong, redirect to that user's own home.

### 5.2 Shared interfaces (agree on these so both UI branches can work in parallel)

**`AuthContext`** (`client/src/context/AuthContext.jsx`, admin-ui builds it first, since it unblocks student-ui):
```js
const { user, token, loading, login, register, logout } = useAuth();
// user:     null | User object (see api-contract.md 1.6)
// loading:  true while restoring the session via GET /auth/me on first load
// login(email, password)  -> Promise<User>   (throws the API error object)
// register(formData)      -> Promise<User>
// logout()                -> void (clears token, navigates to /login)
```

**`api.js`** (`client/src/services/api.js`, admin-ui):
- An axios instance with `baseURL = import.meta.env.VITE_API_BASE_URL || '/api'`.
- A request interceptor adds `Authorization: Bearer ${localStorage.pt_token}`.
- A response interceptor turns errors into `{ status, code, message, details }`, and on `401` clears the token and redirects to login.

**Service modules** (each UI branch writes its own; each function returns `response.data`):
- `authService.js`: `register`, `login`, `me`
- `driveService.js`: `listDrives(params)`, `getDrive(id)`, `createDrive`, `updateDrive`, `deleteDrive`, `applyToDrive(id)`, `getApplicants(id, params)`
- `applicationService.js`: `getMyApplications`, `getApplication(id)`, `updateStage(id, body)`, `updateNotes(id, notes)`, `getReminders(days)`
- `adminService.js`: `getStats(params)`

Until the backend is merged, a UI branch may stub a service function with data copied from `api-contract.md`. Remove the stubs before opening the PR.

**Shared components** (`components/common`). Whoever needs one first builds it and tells the team in the group chat to avoid duplicates:
`Button`, `Input`, `Select`, `Textarea`, `Modal`, `ConfirmDialog`, `Toast`, `Badge` / `StageBadge`, `Card`, `EmptyState`, `Spinner`, `Pagination`.

### 5.3 Data flow example: student applies to a drive

```
DriveDetailsPage
  → user clicks "Apply" → ConfirmDialog → driveService.applyToDrive(id)
  → POST /api/drives/:id/apply  (Bearer token)
  → protect → requireRole('student') → applyToDrive controller
      → load drive → check open + deadline → eligibility.isEligible(user, drive)
      → Application.create({ student, drive, stage:'applied', stageHistory:[...] })
  ← 201 { application }
  → toast "Applied to Infosys" → button becomes "Applied ✓" → link "Track on board"
```

### 5.4 Data flow example: admin moves an applicant to Interview

```
ApplicantsPage → StageSelect (offers only valid next stages from stages.js copy in client/utils)
  → PATCH /api/applications/:id/stage { stage:'interview', remark }
  → protect → requireRole('admin') → validate → updateStage controller
      → check TRANSITIONS[current].includes(next) → push stageHistory → save
  ← 200 { application }
  → row badge updates; stage tab counts update; toast "Moved Asha Rao to Interview"
Student later opens /student/applications → card is now in the Interview column
```

## 6. Environments and config

| Variable | Where | Purpose |
|---|---|---|
| `PORT`, `NODE_ENV` | server | |
| `MONGO_URI` | server | Local MongoDB or Atlas |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | server | Token signing |
| `CLIENT_URL` | server | CORS origin |
| `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD` | server | Seed script only |
| `VITE_API_BASE_URL` | client | API base, default `/api` |
| `VITE_REMINDER_DAYS` | client | Reminder window |

See `server/.env.example` and `client/.env.example`. Real `.env` files are git-ignored.

## 7. Deployment (later)

Client on Vercel or Netlify (`npm run build` → `client/dist`), server on Render or Railway, database on MongoDB Atlas (free tier). Set `CLIENT_URL` on the server and `VITE_API_BASE_URL` on the client to the deployed URLs.
