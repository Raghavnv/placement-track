# API Contract

This is the agreement between the backend (`feature/backend-api`) and both UIs (`feature/student-ui`, `feature/admin-ui`). Frontend work can start right away by mocking these responses. **If you need to change anything here, change this file in the same PR and tell the team.**

- **Base URL (dev):** `http://localhost:5050/api` (the client calls `/api/...`; Vite proxies it)
- **Format:** JSON in, JSON out. Send `Content-Type: application/json`.
- **Dates:** ISO 8601 strings in UTC, e.g. `"2026-11-15T18:29:59.000Z"`.
- **IDs:** MongoDB ObjectId strings (24 hex chars).
- **Postman:** import `docs/postman/PlacementTrack.postman_collection.json`.

---

## 1. Conventions

### 1.1 Authentication

Protected routes need this header:

```
Authorization: Bearer <JWT>
```

The JWT payload is `{ "sub": "<userId>", "role": "student" | "admin", "iat": ..., "exp": ... }`. It is signed with `JWT_SECRET` and expires after `JWT_EXPIRES_IN` (default 7 days). The client stores it in `localStorage` under `pt_token`.

The **Auth** column below means:

| Value | Meaning |
|---|---|
| Public | No token needed |
| Any | Any logged-in user (student or admin) |
| Student | Token with `role: "student"`; otherwise `403` |
| Admin | Token with `role: "admin"`; otherwise `403` |

### 1.2 Error format

Every error response has this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable summary safe to show in the UI",
    "details": [
      { "field": "email", "message": "Email is required" }
    ]
  }
}
```

`details` is only present for `VALIDATION_ERROR`. The UI shows `message` in a toast and puts each `details[].message` under its form field.

| HTTP | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body or query fails validation |
| 400 | `INVALID_ID` | `:id` is not a valid ObjectId |
| 400 | `DEADLINE_PASSED` | Applying after the drive deadline |
| 400 | `INVALID_STAGE_TRANSITION` | Stage change not allowed (see 1.4) |
| 401 | `UNAUTHORIZED` | Missing, malformed or expired token |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password at login |
| 403 | `FORBIDDEN` | Valid token, wrong role, or not the owner |
| 403 | `NOT_ELIGIBLE` | Student does not meet drive eligibility |
| 404 | `NOT_FOUND` | Resource or route does not exist |
| 409 | `EMAIL_TAKEN` | Register with an existing email |
| 409 | `ROLL_NUMBER_TAKEN` | Register with an existing roll number |
| 409 | `ALREADY_APPLIED` | Student already applied to this drive |
| 409 | `DRIVE_CLOSED` | Applying to a drive whose `status` is `closed` |
| 413 | `PAYLOAD_TOO_LARGE` | Request body over 100 KB |
| 429 | `TOO_MANY_REQUESTS` | More than 20 login/register attempts in 15 minutes from one IP |
| 500 | `INTERNAL_ERROR` | Anything unexpected (never leak stack traces) |

### 1.3 Pagination

List endpoints accept `?page=1&limit=10` (`limit` max 50) and return:

```json
{
  "data": [ ... ],
  "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

### 1.4 Application stages

| Stage key | Label shown in UI |
|---|---|
| `applied` | Applied |
| `aptitude` | Aptitude Test |
| `interview` | Interview |
| `offer` | Offer |
| `rejected` | Rejected |

Allowed transitions (admin only). Anything else returns `400 INVALID_STAGE_TRANSITION`:

```
applied   -> aptitude | rejected
aptitude  -> interview | rejected
interview -> offer | rejected
offer     -> (final)
rejected  -> (final)
```

Skipping a round (e.g. `applied -> interview`) is not allowed; the admin advances one step at a time. Every change is added to `stageHistory`.

### 1.5 Eligibility rule

A student is eligible for a drive when **all** of these are true:
- `student.cgpa >= drive.eligibility.minCgpa`
- `drive.eligibility.branches` is empty **or** contains `student.branch`
- `drive.eligibility.graduationYear` is null **or** equals `student.graduationYear`
- `student.backlogs <= drive.eligibility.maxBacklogs`

### 1.6 Shared response objects

**User** (`passwordHash` is never returned):
```json
{
  "_id": "6650f1c2a1b2c3d4e5f60001",
  "name": "Asha Rao",
  "email": "asha@college.edu",
  "role": "student",
  "rollNumber": "21CS045",
  "branch": "CSE",
  "cgpa": 8.4,
  "backlogs": 0,
  "graduationYear": 2027,
  "phone": "9876543210",
  "college": "RV College of Engineering",
  "skills": ["Java", "Python", "SQL", "React"],
  "interests": ["web", "ai"],
  "preferredRoles": ["software", "web"],
  "preferredLocations": ["Bengaluru", "Hyderabad"],
  "jobTypes": ["full-time"],
  "expectedPackage": 6,
  "needsOnboarding": false,
  "createdAt": "2026-10-27T09:00:00.000Z",
  "updatedAt": "2026-10-27T09:00:00.000Z"
}
```
Admin users only have `_id, name, email, role, createdAt, updatedAt`.

**Drive:**
```json
{
  "_id": "6650f1c2a1b2c3d4e5f60101",
  "companyName": "Infosys",
  "role": "Systems Engineer",
  "description": "Full-time role in Bengaluru. Training at Mysuru campus.",
  "package": 6.5,
  "location": "Bengaluru",
  "jobType": "full-time",
  "eligibility": {
    "minCgpa": 7.0,
    "branches": ["CSE", "ISE", "ECE"],
    "graduationYear": 2027,
    "maxBacklogs": 0
  },
  "deadline": "2026-11-15T18:29:59.000Z",
  "driveDate": "2026-11-20T04:30:00.000Z",
  "status": "open",
  "applicantCount": 37,
  "createdBy": "6650f1c2a1b2c3d4e5f60000",
  "createdAt": "2026-10-27T09:00:00.000Z",
  "updatedAt": "2026-10-27T09:00:00.000Z"
}
```
`package` is CTC in LPA (lakhs per annum). Drives also have `"skills": ["Java", "SQL"]` (tags used for matching).

For students, list and detail responses also include:
```json
"isEligible": true,
"hasApplied": false,
"matchScore": 87,
"matchReasons": ["3 of 4 skills match (Java, SQL, DSA)", "Fits your Software Engineer goal", "Bengaluru is on your list"]
```
`matchScore` (0-100) compares the drive with the student's onboarding answers. Weights: skills 35, role 25, interests 10, location 10, job type 10, package 10 (`server/src/utils/matching.js`). Students who haven't answered get neutral partial credit.

**Application:**
```json
{
  "_id": "6650f1c2a1b2c3d4e5f60201",
  "student": "6650f1c2a1b2c3d4e5f60001",
  "drive": { "_id": "6650f1c2a1b2c3d4e5f60101", "companyName": "Infosys", "role": "Systems Engineer", "package": 6.5, "deadline": "2026-11-15T18:29:59.000Z", "driveDate": "2026-11-20T04:30:00.000Z" },
  "stage": "aptitude",
  "stageHistory": [
    { "stage": "applied",  "changedAt": "2026-10-28T10:00:00.000Z", "changedBy": "6650f1c2a1b2c3d4e5f60001", "remark": "" },
    { "stage": "aptitude", "changedAt": "2026-11-02T11:30:00.000Z", "changedBy": "6650f1c2a1b2c3d4e5f60000", "remark": "Shortlisted for online test on 5 Nov" }
  ],
  "notes": "Revise DBMS normalisation and OS scheduling.",
  "createdAt": "2026-10-28T10:00:00.000Z",
  "updatedAt": "2026-11-02T11:30:00.000Z"
}
```
`drive` is populated with the fields shown. In admin applicant lists, `student` is populated instead (see 4.3).

---

## 2. Endpoint summary

| # | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| 0 | GET | `/api/health` | Public | Liveness check |
| 1 | POST | `/api/auth/register` | Public | Student sign-up |
| 2 | POST | `/api/auth/login` | Public | Login (student or admin) |
| 3 | GET | `/api/auth/me` | Any | Current user profile |
| 4 | GET | `/api/drives` | Any | List drives (filter, search, paginate) |
| 5 | GET | `/api/drives/:id` | Any | Drive details |
| 6 | POST | `/api/drives` | Admin | Create drive |
| 7 | PUT | `/api/drives/:id` | Admin | Update drive |
| 8 | DELETE | `/api/drives/:id` | Admin | Delete drive and its applications |
| 9 | POST | `/api/drives/:id/apply` | Student | Apply to a drive |
| 10 | GET | `/api/drives/:id/applicants` | Admin | Applicants for a drive |
| 11 | GET | `/api/applications/me` | Student | My applications (Kanban data) |
| 12 | GET | `/api/applications/:id` | Student (owner) / Admin | One application |
| 13 | PATCH | `/api/applications/:id/stage` | Admin | Move applicant to next stage |
| 14 | PATCH | `/api/applications/:id/notes` | Student (owner) | Save prep notes |
| 15 | GET | `/api/applications/me/reminders` | Student | Upcoming deadlines and drive dates |
| 16 | GET | `/api/admin/stats` | Admin | Dashboard statistics |
| 17 | GET | `/api/applications/me/calendar.ics` | Student | Calendar file of deadlines and drive days |
| 18 | PATCH | `/api/auth/me` | Student | Save onboarding answers / profile |
| 19 | PUT | `/api/auth/me/resume` | Student | Upload or replace resume (PDF/JPG, max 2 MB) |
| 20 | GET | `/api/auth/me/resume` | Student | Download own resume |
| 21 | DELETE | `/api/auth/me/resume` | Student | Remove own resume |
| 22 | GET | `/api/admin/students/:id/resume` | Admin | Open a student's resume |

---

## 3. Auth

### 0. `GET /api/health`
**200** `{ "status": "ok" }`

### 1. `POST /api/auth/register`
Creates a **student** account. Admin accounts are created only by `npm run seed:admin` (production) or `npm run seed` (development demo data); the `role` field is ignored if sent.

Request:
```json
{
  "name": "Asha Rao",
  "email": "asha@college.edu",
  "password": "Str0ngPass!",
  "college": "RV College of Engineering",
  "rollNumber": "21CS045",
  "branch": "CSE",
  "cgpa": 8.4,
  "backlogs": 0,
  "graduationYear": 2027,
  "phone": "9876543210"
}
```

Validation:
| Field | Rule |
|---|---|
| name | required, 2-80 chars, trimmed |
| email | required, valid email, stored lowercase, unique |
| password | required, min 8 chars, at least one letter and one number |
| college | required, 2-120 chars |
| rollNumber | required, 3-20 chars, unique |
| branch | required, one of `CSE, ISE, ECE, EEE, ME, CE, AIML, DS, OTHER` |
| cgpa | required, number 0-10 |
| backlogs | optional, integer >= 0, default 0 |
| graduationYear | required, integer 2020-2035 |
| phone | optional, 10 digits |

**201**
```json
{ "token": "<JWT>", "user": { /* User, with "needsOnboarding": true */ } }
```
New students have `needsOnboarding: true`. The client sends them through the onboarding questions (skills, interests, roles, preferences) and then calls `PATCH /api/auth/me` with `needsOnboarding: false`.

Errors: `400 VALIDATION_ERROR`, `409 EMAIL_TAKEN`, `409 ROLL_NUMBER_TAKEN`, `429 TOO_MANY_REQUESTS`.

### 2. `POST /api/auth/login`
Request:
```json
{ "email": "asha@college.edu", "password": "Str0ngPass!" }
```
**200**
```json
{ "token": "<JWT>", "user": { /* User */ } }
```
Errors: `400 VALIDATION_ERROR`, `429 TOO_MANY_REQUESTS`, `401 INVALID_CREDENTIALS` (same message for unknown email and wrong password, so you can't tell which accounts exist).

The client sends the user to `/student` or `/admin` based on `user.role`. The admin login page (`/admin/login`) shows "This account is not a placement officer account" if `role` is `student`, and does not keep the token.

### 3. `GET /api/auth/me`
**200** `{ "user": { /* User */ } }`
Errors: `401 UNAUTHORIZED`. The client calls this on page load to restore the session; on `401` it clears the token and redirects to login.

### 18. `PATCH /api/auth/me`  (Student)
Saves onboarding answers or profile edits. Send any subset of these fields; anything else (CGPA, branch, role…) is ignored.

| Field | Rule |
|---|---|
| college | 2-120 chars |
| phone | 10 digits, or `""` to clear |
| skills | up to 25 strings (1-40 chars), de-duplicated case-insensitively |
| interests | up to 12 of `ai, web, mobile, data, cloud, security, product, core, embedded, finance, consulting, research` |
| preferredRoles | up to 5 of `software, web, data, cloud, security, consulting, product, core, embedded, finance` |
| preferredLocations | up to 8 strings (e.g. `Bengaluru`, `Remote`, `Anywhere`) |
| jobTypes | `full-time` and/or `internship` |
| expectedPackage | number 0-200 (LPA), or `null` to clear |
| needsOnboarding | only `false` (marks onboarding complete) |

**200** `{ "user": { /* User */ } }`
Errors: `400 VALIDATION_ERROR`, `401`, `403` (admin token).

### 19. `PUT /api/auth/me/resume`  (Student)
Uploads the student's resume, replacing any earlier one. The request body is the **raw file bytes** (not JSON or multipart), sent with the file's `Content-Type`; the original file name goes in the `name` query parameter.

```
PUT /api/auth/me/resume?name=Asha%20Rao%20Resume.pdf
Content-Type: application/pdf

<file bytes>
```

| Rule | |
|---|---|
| Type | PDF or JPG, detected from the file's first bytes (`%PDF-` / `FF D8 FF`), not from the name or header |
| Size | max 2 MB |
| `name` | optional; unsafe characters stripped, extension set from the detected type (default `resume.pdf`) |

**200** `{ "user": { /* User, with resume: { fileName, mimeType, size, uploadedAt } */ } }`
Errors: `400 VALIDATION_ERROR` (empty body), `413 PAYLOAD_TOO_LARGE`, `415 UNSUPPORTED_FILE_TYPE`, `401`, `403` (admin token).

### 20. `GET /api/auth/me/resume`  (Student)
**200** the file, with `Content-Type` set to its type and `Content-Disposition: inline; filename="<fileName>"`. The client fetches it as a blob (it needs the auth header) and opens it in a new tab.
Errors: `404 NOT_FOUND` (nothing uploaded), `401`, `403`.

### 21. `DELETE /api/auth/me/resume`  (Student)
**200** `{ "user": { /* User, without resume */ } }`. Succeeds even if there was no resume.

### 22. `GET /api/admin/students/:id/resume`  (Admin)
Same response as #20, for any student. Applicant rows from #10 include `student.resume` (`{ fileName, mimeType, size, uploadedAt }`, missing when none), so the officer UI only shows *View* for students who uploaded one.
Errors: `400 INVALID_ID`, `404 NOT_FOUND` (no such student, or no resume), `401`, `403` (student token).

---

## 4. Drives

### 4. `GET /api/drives`
Query parameters (all optional):

| Param | Type | Description |
|---|---|---|
| `status` | `open` \| `closed` \| `all` | If omitted: students see only drives they can still apply to (`open` **and** deadline not passed); admins see all |
| `search` | string | Case-insensitive match on `companyName` or `role` |
| `jobType` | `full-time` \| `internship` | |
| `minPackage` | number | `package >= minPackage` |
| `eligibleOnly` | `true` | Students only: only drives they are eligible for |
| `sort` | `deadline` \| `-createdAt` \| `-package` \| `match` | Default `deadline` (soonest first). `match` (students only) ranks by `matchScore` |
| `page`, `limit` | number | See 1.3 |

**200** paginated list of Drive objects (students also get `isEligible` and `hasApplied`).

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`.

### 5. `GET /api/drives/:id`
**200** `{ "drive": { /* Drive */ } }`

For students, `drive` also includes `eligibilityChecks`, one per criterion, for the eligibility checklist UI:
```json
"eligibilityChecks": [
  { "field": "cgpa", "label": "CGPA ≥ 7", "actual": 8.4, "passed": true },
  { "field": "branch", "label": "Branch: CSE, ISE", "actual": "CSE", "passed": true },
  { "field": "graduationYear", "label": "Graduating in 2027", "actual": 2027, "passed": true },
  { "field": "backlogs", "label": "Backlogs ≤ 0", "actual": 1, "passed": false }
]
```
Errors: `400 INVALID_ID`, `401 UNAUTHORIZED`, `404 NOT_FOUND`.

### 6. `POST /api/drives`  (Admin)
Request:
```json
{
  "companyName": "Infosys",
  "role": "Systems Engineer",
  "description": "Full-time role in Bengaluru.",
  "package": 6.5,
  "location": "Bengaluru",
  "jobType": "full-time",
  "eligibility": { "minCgpa": 7.0, "branches": ["CSE", "ISE"], "graduationYear": 2027, "maxBacklogs": 0 },
  "deadline": "2026-11-15T18:29:59.000Z",
  "driveDate": "2026-11-20T04:30:00.000Z"
}
```

Validation:
| Field | Rule |
|---|---|
| companyName | required, 2-100 chars |
| role | required, 2-100 chars |
| description | optional, max 2000 chars |
| package | required, number > 0 and <= 200 (LPA) |
| location | optional, max 100 chars |
| jobType | required, `full-time` or `internship` |
| eligibility.minCgpa | required, 0-10 |
| eligibility.branches | optional array of branch codes; empty means all branches |
| eligibility.graduationYear | optional integer or null |
| eligibility.maxBacklogs | optional integer >= 0, default 0 |
| skills | optional array of up to 15 strings, used for match scores |
| deadline | required, ISO date in the future |
| driveDate | optional, ISO date on or after `deadline` |

`status` defaults to `open`. `createdBy` is set from the token.

**201** `{ "drive": { /* Drive */ } }`
Errors: `400 VALIDATION_ERROR`, `401`, `403 FORBIDDEN`.

### 7. `PUT /api/drives/:id`  (Admin)
Same body as create, plus optional `"status": "open" | "closed"`. Only the fields you send are updated. When editing, `deadline` may be in the past (so old drives can be corrected or closed).

**200** `{ "drive": { /* Drive */ } }`
Errors: `400 VALIDATION_ERROR | INVALID_ID`, `401`, `403`, `404 NOT_FOUND`.

### 8. `DELETE /api/drives/:id`  (Admin)
Deletes the drive **and all its applications**. The UI must show a confirmation dialog with the applicant count first.

**200** `{ "message": "Drive deleted", "deletedApplications": 37 }`
Errors: `400 INVALID_ID`, `401`, `403`, `404 NOT_FOUND`.

### 9. `POST /api/drives/:id/apply`  (Student)
No body. Checks are done in this order: drive exists, then `status` is `open`, then the deadline has not passed, then the student is eligible, then they have not already applied.

**201** `{ "application": { /* Application, stage "applied" */ } }`
Errors: `400 INVALID_ID`, `400 DEADLINE_PASSED`, `401`, `403 FORBIDDEN` (admin token), `403 NOT_ELIGIBLE`, `404 NOT_FOUND`, `409 DRIVE_CLOSED`, `409 ALREADY_APPLIED`.

`NOT_ELIGIBLE` lists the failed criteria in `details`, e.g. `[{ "field": "cgpa", "message": "Requires CGPA ≥ 7" }]`.

### 10. `GET /api/drives/:id/applicants`  (Admin)
Query: `stage` (one stage key, optional), `search` (student name or roll number), `page`, `limit`.

**200**
```json
{
  "drive": { "_id": "...", "companyName": "Infosys", "role": "Systems Engineer" },
  "stageCounts": { "applied": 20, "aptitude": 10, "interview": 4, "offer": 1, "rejected": 2 },
  "data": [
    {
      "_id": "6650f1c2a1b2c3d4e5f60201",
      "student": { "_id": "...", "name": "Asha Rao", "email": "asha@college.edu", "rollNumber": "21CS045", "branch": "CSE", "cgpa": 8.4, "backlogs": 0, "graduationYear": 2027, "phone": "9876543210" },
      "stage": "aptitude",
      "stageHistory": [ /* StageEvent[], for remarks and timeline */ ],
      "createdAt": "2026-10-28T10:00:00.000Z",
      "updatedAt": "2026-11-02T11:30:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 37, "totalPages": 4 }
}
```
Student `notes` are private and **never** included in admin responses.

Errors: `400 INVALID_ID | VALIDATION_ERROR`, `401`, `403`, `404 NOT_FOUND`.

---

## 5. Applications

### 11. `GET /api/applications/me`  (Student)
Not paginated, because the Kanban board needs every application. Sorted by `updatedAt` desc.

**200**
```json
{
  "data": [ { /* Application with populated drive */ } ],
  "countsByStage": { "applied": 3, "aptitude": 1, "interview": 1, "offer": 0, "rejected": 1 }
}
```
Errors: `401`, `403`.

### 12. `GET /api/applications/:id`
A student can only read their own application (otherwise `404 NOT_FOUND`, so other students' IDs aren't revealed). An admin can read any application, but **without `notes`**.

**200** `{ "application": { /* Application */ } }`
Errors: `400 INVALID_ID`, `401`, `404 NOT_FOUND`.

### 13. `PATCH /api/applications/:id/stage`  (Admin)
Request:
```json
{ "stage": "interview", "remark": "Cleared aptitude, interview on 10 Nov" }
```
| Field | Rule |
|---|---|
| stage | required, a valid stage key that is allowed from the current stage (see 1.4) |
| remark | optional, max 300 chars; students see it in their timeline |

**200** `{ "application": { /* Application, updated stage and stageHistory */ } }`
Errors: `400 VALIDATION_ERROR | INVALID_ID | INVALID_STAGE_TRANSITION`, `401`, `403`, `404 NOT_FOUND`.

### 14. `PATCH /api/applications/:id/notes`  (Student, owner only)
Request:
```json
{ "notes": "Revise DBMS normalisation and OS scheduling." }
```
`notes`: string, max 5000 chars; empty string clears it. Plain text (the UI must not render it as HTML).

**200** `{ "application": { /* Application */ } }`
Errors: `400 VALIDATION_ERROR | INVALID_ID`, `401`, `403`, `404 NOT_FOUND` (not found or not yours).

### 15. `GET /api/applications/me/reminders`  (Student)
Query: `days` (1-30, default 7).

Returns two lists:
- **Deadlines**: open drives the student is **eligible for and has not applied to** whose `deadline` is within `days`.
- **Upcoming drive dates**: drives the student **has applied to** (stage not `rejected`) whose `driveDate` is within `days`.

**200**
```json
{
  "deadlines": [
    { "driveId": "...", "companyName": "TCS", "role": "Ninja", "deadline": "2026-10-29T18:29:59.000Z", "hoursLeft": 52 }
  ],
  "upcomingDrives": [
    { "applicationId": "...", "driveId": "...", "companyName": "Infosys", "role": "Systems Engineer", "driveDate": "2026-11-01T04:30:00.000Z", "stage": "aptitude" }
  ]
}
```
In the UI, items under 24 hours left are shown as urgent (danger colour), and under 72 hours as a warning.

Note: route order matters in Express. Register `/applications/me`, `/applications/me/reminders` and `/applications/me/calendar.ics` **before** `/applications/:id`.

### 17. `GET /api/applications/me/calendar.ics`  (Student)
Downloads an iCalendar (`.ics`) file that students can import into Google Calendar, Apple Calendar or Outlook. It contains:
- a 1-hour event ending at each **deadline** for open drives they are eligible for and have not applied to (with an alert 1 day before)
- a 3-hour event at each **drive date** for active applications (with an alert 12 hours before)

It covers the next 365 days. **200** with `Content-Type: text/calendar` and `Content-Disposition: attachment; filename="placementtrack.ics"`.

Because it needs the Bearer token, the UI should fetch it with axios (`responseType: 'blob'`) and trigger the download, not link to it directly.

Errors: `401`, `403`.

---

## 6. Admin

### 16. `GET /api/admin/stats`  (Admin)
Query: `graduationYear` (optional filter).

**200**
```json
{
  "totals": {
    "students": 412,
    "drives": 18,
    "openDrives": 6,
    "applications": 1290,
    "offers": 74,
    "studentsPlaced": 69
  },
  "placementRate": 16.7,
  "packageStats": { "highest": 24.0, "average": 7.8, "median": 6.5 },
  "applicationsByStage": { "applied": 610, "aptitude": 280, "interview": 120, "offer": 74, "rejected": 206 },
  "funnel": [
    { "stage": "applied", "label": "Applied", "reached": 1290, "percentOfApplied": 100 },
    { "stage": "aptitude", "label": "Aptitude Test", "reached": 680, "percentOfApplied": 52.7 },
    { "stage": "interview", "label": "Interview", "reached": 250, "percentOfApplied": 19.4 },
    { "stage": "offer", "label": "Offer", "reached": 74, "percentOfApplied": 5.7 }
  ],
  "placedByBranch": [ { "branch": "CSE", "placed": 31, "total": 120 } ],
  "topDrives": [ { "driveId": "...", "companyName": "Infosys", "role": "Systems Engineer", "applicants": 98, "offers": 12 } ],
  "upcomingDeadlines": [ { "driveId": "...", "companyName": "TCS", "deadline": "2026-10-29T18:29:59.000Z", "applicants": 40 } ]
}
```
- `openDrives` = drives with `status: open` whose deadline has not passed.
- `studentsPlaced` = distinct students with at least one `offer`.
- `applicationsByStage` counts the **current** stage; `funnel` counts how many applications **ever reached** each stage (from `stageHistory`), showing where students drop off.
- `placementRate` = `studentsPlaced / students * 100`, rounded to 1 decimal place.
- `packageStats` is calculated over all offers (each offer counts its drive's package). All zeros when there are no offers.
- `topDrives` = the 5 drives with the most applicants. `upcomingDeadlines` = the next 5 open drives.

Errors: `401`, `403`.

---

## 7. Changelog

| Date | Change | By |
|---|---|---|
| 2026-10-27 | Initial contract | Raghav |
| 2026-10-28 | Resume upload: new #19-21 `/auth/me/resume`, `User.resume`, `415 UNSUPPORTED_FILE_TYPE`; #22 officer resume view, `student.resume` in applicants | Pranav |
| 2026-10-28 | Onboarding: `college` on register, `needsOnboarding`, new #18 `PATCH /auth/me`, drive `skills`, `matchScore`/`matchReasons`, `sort=match` | Raghav |
| 2026-10-27 | Backend implemented. Added `ROLL_NUMBER_TAKEN`, `413`, `429`; students' default drive list hides past deadlines; `eligibilityChecks` on drive details; `stageHistory` in applicants; `funnel` in stats; new #17 calendar export; dev port 5050 | Raghav |
