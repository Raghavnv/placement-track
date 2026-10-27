# Database Schema

MongoDB with Mongoose. The database is `placement-track` and has three collections: `users`, `drives`, `applications`. Every schema uses `{ timestamps: true }`, so Mongoose adds `createdAt` and `updatedAt` automatically.

## Relationships

```
 users (role: admin) 1 ──creates──< drives
 users (role: student) 1 ──< applications >── 1 drives
```

- One **admin** creates many **drives** (`Drive.createdBy -> User._id`).
- One **student** has many **applications**; one **drive** has many **applications**.
- `Application` is the join between a student and a drive. It is **unique per (student, drive)**.
- Deleting a drive deletes its applications (done in the controller with `Application.deleteMany({ drive })`).

---

## 1. `User`  (collection: `users`)

| Field | Type | Required | Constraints / default | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | auto | | |
| `name` | String | yes | trim, 2-80 chars | |
| `email` | String | yes | **unique**, lowercase, trim, email format | Login identifier |
| `passwordHash` | String | yes | `select: false` | bcrypt hash, 10 salt rounds. Never returned by the API |
| `role` | String | yes | enum `student`, `admin`; default `student` | |
| `rollNumber` | String | students | **unique, sparse**, uppercase, trim | Admin users don't have one |
| `branch` | String | students | enum `CSE, ISE, ECE, EEE, ME, CE, AIML, DS, OTHER` | |
| `cgpa` | Number | students | min 0, max 10 | |
| `backlogs` | Number | no | integer, min 0, default 0 | Active backlogs |
| `graduationYear` | Number | students | 2020-2035 | |
| `phone` | String | no | 10 digits | |
| `college` | String | students (on register) | max 120 | |
| `skills` | [String] | no | max 25, each ≤ 40 chars | Onboarding answer, used for match scores |
| `interests` | [String] | no | enum of interest keys | See `utils/profileOptions.js` |
| `preferredRoles` | [String] | no | enum of role keys | See `utils/profileOptions.js` |
| `preferredLocations` | [String] | no | max 8 | |
| `jobTypes` | [String] | no | `full-time`, `internship` | |
| `expectedPackage` | Number | no | 0-200 (LPA) | |
| `needsOnboarding` | Boolean | no | `true` on register, `false` once onboarding is done | Missing = no onboarding needed (older accounts) |
| `createdAt` / `updatedAt` | Date | auto | | |

Indexes: `{ email: 1 }` unique, `{ rollNumber: 1 }` unique sparse, `{ role: 1 }`.

Model notes:
- Add an instance method `comparePassword(plain)` that uses `bcrypt.compare`.
- Add a `toJSON` transform that removes `passwordHash` and `__v`.
- Make student-only fields conditionally required: `required: function () { return this.role === 'student'; }`.

## 2. `Drive`  (collection: `drives`)

| Field | Type | Required | Constraints / default | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | auto | | |
| `companyName` | String | yes | trim, 2-100 chars | |
| `role` | String | yes | trim, 2-100 chars | Job title |
| `description` | String | no | max 2000 chars | |
| `package` | Number | yes | > 0, <= 200 | CTC in LPA |
| `location` | String | no | max 100 chars | |
| `jobType` | String | yes | enum `full-time`, `internship` | |
| `skills` | [String] | no | max 15, default `[]` | Skill tags used for match scores |
| `eligibility` | Object (subdocument) | yes | | See below |
| `eligibility.minCgpa` | Number | yes | 0-10, default 0 | |
| `eligibility.branches` | [String] | no | branch enum; default `[]` | Empty = open to all branches |
| `eligibility.graduationYear` | Number | no | default `null` | `null` = any year |
| `eligibility.maxBacklogs` | Number | no | min 0, default 0 | |
| `deadline` | Date | yes | | Last moment to apply |
| `driveDate` | Date | no | must be >= `deadline` | Test or interview day |
| `status` | String | yes | enum `open`, `closed`; default `open` | Admin can close early |
| `createdBy` | ObjectId -> `User` | yes | | Admin who posted it |
| `createdAt` / `updatedAt` | Date | auto | | |

Indexes: `{ status: 1, deadline: 1 }` (student listing), `{ companyName: 'text', role: 'text' }` or a case-insensitive regex for search.

`applicantCount` is **not stored**. It is calculated with an aggregation or `Application.countDocuments({ drive })`, so it never goes out of sync.

## 3. `Application`  (collection: `applications`)

| Field | Type | Required | Constraints / default | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | auto | | |
| `student` | ObjectId -> `User` | yes | | Must have `role: student` |
| `drive` | ObjectId -> `Drive` | yes | | |
| `stage` | String | yes | enum `applied, aptitude, interview, offer, rejected`; default `applied` | Current Kanban column |
| `stageHistory` | [StageEvent] | yes | default: one `applied` event | Append only |
| `notes` | String | no | max 5000 chars, default `''` | Private to the student |
| `createdAt` / `updatedAt` | Date | auto | | `createdAt` = applied date |

**StageEvent** (subdocument, `_id: false`):

| Field | Type | Notes |
|---|---|---|
| `stage` | String | Same enum as `stage` |
| `changedAt` | Date | default `Date.now` |
| `changedBy` | ObjectId -> `User` | Student for `applied`, admin after that |
| `remark` | String | max 300 chars, optional |

Indexes:
- `{ student: 1, drive: 1 }` **unique**. This blocks duplicate applications even if two requests arrive at the same time; catch error code `11000` and return `409 ALREADY_APPLIED`.
- `{ drive: 1, stage: 1 }` for the applicants table and stage counts.
- `{ student: 1, updatedAt: -1 }` for the Kanban board.

Allowed stage transitions live in one shared constant (`server/src/utils/stages.js`) so the controller and the tests use the same rules:

```js
const STAGES = ['applied', 'aptitude', 'interview', 'offer', 'rejected'];
const TRANSITIONS = {
  applied: ['aptitude', 'rejected'],
  aptitude: ['interview', 'rejected'],
  interview: ['offer', 'rejected'],
  offer: [],
  rejected: [],
};
```

---

## Sample documents

```js
// users
{ _id: ObjectId("...0000"), name: "Placement Officer", email: "officer@college.edu", passwordHash: "$2a$10$...", role: "admin" }
{ _id: ObjectId("...0001"), name: "Asha Rao", email: "asha@college.edu", passwordHash: "$2a$10$...", role: "student",
  rollNumber: "21CS045", branch: "CSE", cgpa: 8.4, backlogs: 0, graduationYear: 2027, phone: "9876543210" }

// drives
{ _id: ObjectId("...0101"), companyName: "Infosys", role: "Systems Engineer", package: 6.5, jobType: "full-time",
  eligibility: { minCgpa: 7, branches: ["CSE","ISE","ECE"], graduationYear: 2027, maxBacklogs: 0 },
  deadline: ISODate("2026-11-15T18:29:59Z"), driveDate: ISODate("2026-11-20T04:30:00Z"),
  status: "open", createdBy: ObjectId("...0000") }

// applications
{ _id: ObjectId("...0201"), student: ObjectId("...0001"), drive: ObjectId("...0101"), stage: "aptitude",
  stageHistory: [
    { stage: "applied",  changedAt: ISODate("2026-10-28T10:00:00Z"), changedBy: ObjectId("...0001"), remark: "" },
    { stage: "aptitude", changedAt: ISODate("2026-11-02T11:30:00Z"), changedBy: ObjectId("...0000"), remark: "Online test on 5 Nov" }
  ],
  notes: "Revise DBMS normalisation." }
```

## Seed data (for development)

The backend branch should add `npm run seed` (`server/src/utils/seed.js`). It should create 1 admin, about 10 students across branches and CGPAs, 6 drives (some open, one closed, one with a deadline tomorrow), and applications spread across every stage. Then both UIs have realistic data from day one.
