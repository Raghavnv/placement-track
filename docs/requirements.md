# Requirements

## 1. Problem

College placement cells usually announce drives over WhatsApp groups and spreadsheets. Students miss deadlines and lose track of where they are in each company's process. The placement officer gets little visibility into how the season is going. **PlacementTrack** puts drives, applications and progress in one web app.

## 2. Users

| Role | Who | Goal |
|---|---|---|
| **Student** | Final- and pre-final-year students | Find drives they qualify for, apply quickly, track every application, never miss a deadline |
| **Admin** (Placement Officer) | Training & Placement office staff | Post drives, manage applicants through each round, see placement progress at a glance |

There is a single admin role. Admin accounts are seeded, not self-registered.

## 3. User stories

Priority: **M** = must have (needed for the demo), **S** = should have, **C** = could have (stretch).

### 3.1 Student

| ID | Story | Priority | Acceptance criteria |
|---|---|---|---|
| S-01 | As a student, I want to **register** with my academic details so the system can check my eligibility. | M | Form collects name, email, password, roll number, branch, CGPA, backlogs, graduation year, phone. Fields are validated inline. A duplicate email or roll number shows a clear message. On success I'm logged in and taken to my dashboard. |
| S-02 | As a student, I want to **log in and stay logged in** so I don't re-enter my password on every visit. | M | Wrong credentials show a generic error. The session survives a page refresh (token + `/auth/me`). Logout clears the session. |
| S-03 | As a student, I want to **browse open drives** with company, role, package and deadline so I can decide where to apply. | M | Drives are shown as cards, soonest deadline first. I can search by company or role and filter by job type, minimum package and "eligible only". Pagination or "load more" works. An empty state explains why nothing shows. |
| S-04 | As a student, I want to **see whether I'm eligible** for each drive before I click. | M | Each card shows an "Eligible" or "Not eligible" badge. The details page lists each criterion with a pass/fail tick against my profile. |
| S-05 | As a student, I want to **view drive details** (description, eligibility, deadline, drive date). | M | The details page shows every field. The deadline shows a countdown such as "2 days left". |
| S-06 | As a student, I want to **apply with one click** so applying is fast. | M | The Apply button opens a confirmation. After success the button changes to "Applied", and the application appears on my board. The button is disabled with the reason shown when I'm not eligible, the deadline has passed, the drive is closed, or I've already applied. |
| S-07 | As a student, I want a **Kanban board** of my applications (Applied → Aptitude Test → Interview → Offer/Rejected) so I can see my progress. | M | There is one column per stage, with a card count in each header. Cards show company, role, package and last update. Stage changes come from the admin; students can't move cards. On mobile the columns become horizontally swipeable or tabbed. |
| S-08 | As a student, I want to **see the history** of an application (when each stage changed and any remark). | S | The application detail drawer shows a timeline from `stageHistory`. |
| S-09 | As a student, I want to **write prep notes per application** (topics, interview questions, contacts). | M | There is a notes editor in the application drawer with a 5000-character counter. It saves with a "Saved" indicator, and unsaved changes trigger a warning before closing. Notes are private and never shown to the admin. |
| S-10 | As a student, I want **deadline reminders** for drives I'm eligible for but haven't applied to. | M | The dashboard shows a reminder panel with drives due within 3 days (configurable). Items under 24 hours are highlighted as urgent. Each one links to the drive. |
| S-11 | As a student, I want reminders of **upcoming drive dates** for applications in progress. | S | The same panel lists the drive dates of active applications within 7 days. |
| S-12 | As a student, I want the app to **work well on my phone**. | M | Every page is usable at 360px wide with no horizontal page scroll, and touch targets are at least 44px. |
| S-13 | As a student, I want to **edit my profile** (CGPA, backlogs, phone). | C | Profile page; email and roll number are read-only. *(This needs a `PATCH /api/auth/me` endpoint, which is not in contract v1.)* |

### 3.2 Admin (Placement Officer)

| ID | Story | Priority | Acceptance criteria |
|---|---|---|---|
| A-01 | As an admin, I want to **log in** through a separate officer portal. | M | `/admin/login` page. Student credentials are rejected with a clear message. I'm redirected to `/admin` after login. |
| A-02 | As an admin, I want to **create a drive** with company, role, package, eligibility and deadline. | M | The form validates inline (the deadline must be in the future, and the drive date must be on or after the deadline). Branches are chosen with multi-select chips. A success toast appears and the drive shows in the list. |
| A-03 | As an admin, I want to **edit a drive** to fix mistakes or extend the deadline. | M | The form is pre-filled. Saving updates the listing immediately. I can also close or re-open the drive. |
| A-04 | As an admin, I want to **delete a drive**. | M | A confirmation dialog shows the number of applicants who will be removed. The drive and its applications are deleted. |
| A-05 | As an admin, I want to **see all drives** with applicant counts and status. | M | Table with company, role, package, deadline, status and applicants. Sortable, searchable, with quick links to edit and to applicants. |
| A-06 | As an admin, I want to **view applicants for a drive** with their academic details. | M | Table with name, roll number, branch, CGPA, stage and applied date. Filter by stage using tabs that show counts. Search by name or roll number. Paginated. |
| A-07 | As an admin, I want to **move an applicant to the next stage** (or reject them) with an optional remark. | M | Each row has a stage control that only offers valid next stages. The remark field is optional. The row updates without a full reload. Invalid moves are impossible in the UI and rejected by the API. |
| A-08 | As an admin, I want **bulk stage updates** (e.g. move 30 shortlisted students to Interview). | C | Checkbox selection and a bulk action. *(Needs a bulk endpoint, which is not in contract v1.)* |
| A-09 | As an admin, I want a **dashboard with statistics** so I can report placement progress. | M | Stat cards: students, open drives, applications, students placed, placement rate, highest and average package. Charts: applications by stage, and placed vs total by branch. Lists: top drives and upcoming deadlines. |
| A-10 | As an admin, I want to **export applicants to CSV** for sharing with companies. | C | Export button on the applicants page (can be done fully on the client). |

## 4. Non-functional requirements

| Area | Requirement |
|---|---|
| Security | Passwords hashed with bcrypt. JWT on every protected route. Roles are enforced **on the server** (UI hiding isn't enough). No secrets in git. Student notes are visible only to their owner. |
| Validation | Every request body is validated on the server; the client also validates for quick feedback. |
| Errors | Consistent error format (see `api-contract.md`). No stack traces in responses. |
| Performance | List endpoints are paginated; indexes as described in `database-schema.md`. Pages load in under 2 seconds on campus Wi-Fi. |
| Accessibility | WCAG 2.1 AA colour contrast, keyboard-navigable, visible focus, labelled form fields, and stage shown by text, not only colour. |
| Responsiveness | Mobile-first; tested at 360, 768 and 1280px. |
| Testing | Jest + Supertest for every endpoint's happy path and main error cases; target 70%+ coverage on controllers. Manual UI test checklist in PRs. |
| Browser support | Latest Chrome, Edge, Firefox and Safari. |

## 5. Out of scope (v1)

Email/SMS notifications, resume uploads, company logins, multiple colleges, password reset by email, bulk stage updates and CSV import.
