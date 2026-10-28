# UI / UX Design Guide

Two people are building the UI on separate branches. This guide makes sure the student side and the admin side look and feel like **one product**. All values come from `client/src/styles/tokens.css`; **never hard-code colours, font sizes or spacing in components.**

## 1. Design principles

1. **Clear before clever.** Students check this between classes on their phones. The most important thing on each screen (the next deadline, the current stage) should be readable in 3 seconds.
2. **Show status in text and colour.** Every stage badge has a text label and an icon or column position, never colour alone (colour-blind users, black-and-white printouts).
3. **Always show what happens next.** A disabled button explains why ("Deadline passed on 12 Nov"). An empty list explains what to do ("No applications yet, browse open drives →").
4. **Forgiving.** Confirm anything destructive. Keep form input when a request fails. Warn before leaving unsaved notes.
5. **Consistent.** The same component looks and behaves the same on student and admin pages.

## 2. Visual identity: "workspace" (current)

A calm, professional tool in the spirit of Linear, Notion and Vercel: neutral surfaces, one accent, and colour used only where it carries meaning. The pipeline (Applied → Aptitude → Interview → Offer) still runs through the product: dashboard "Your track", the mini track on every Kanban card, the application timeline.

| Element | Rule |
|---|---|
| Palette | Cool neutral greys (`--color-bg` `#f6f7f9`, white surfaces, `#e4e7ec` borders, `#101828` text). **One accent: indigo** `#4f46e5` for primary actions, links, focus, selection and "you are here". Stage, score and alert colours (blue, amber, violet, green, red) are for data only. The dark theme keeps the same roles on `#0b0d11` / `#121519`. |
| Type | **Inter** for everything (headings 600–650 weight, tight tracking); tabular numbers for packages, scores and counts; **Geist Mono** only for codes like roll numbers. Page titles are plain nouns ("Drives", "My profile"). |
| Emphasis | `<mark>` renders as indigo text, used only on login and onboarding headlines. In-app titles have no emphasis. |
| Depth | 1px borders and soft layered shadows (`--shadow-xs` on cards, `--shadow-md` on hover, `--shadow-lg/xl` on menus, toasts and dialogs). No offset shadows, no rotation. |
| Shape | Radii 6 / 8 / 12 / 16px: inputs and buttons 8, cards 12, dialogs 16. Pills only for badges and filters. |
| Navigation | Light sidebar with a soft indigo active state; tabs underline in indigo; mobile uses a bottom bar. |
| Delight | Kept small: confetti the first time a student sees a new offer; scanning animation before match results; a slow marquee of company chips on auth pages. All respect `prefers-reduced-motion`. |

Legacy class and token names (`--color-lime`, `btn--lime`, `sticker`, `ticket`) still exist so components didn't need rewriting; they now map to the accent, status pills and plain cards.

### Onboarding flow
`/register` (name, **college** search, email, password) → academics (account is created here) → `/onboarding`: skills (branch-aware suggestions + free text) → interests (emoji tiles) → roles (icon tiles, max 5) → preferences (job type, cities, package slider) → matching animation → ranked matches with % and reasons. A live profile summary card fills in on the right as they answer. New students are redirected to `/onboarding` until they finish or skip; "Edit skills & preferences" on the dashboard reopens it.

> Sections 3–8 below describe layouts, states and accessibility rules; they still apply. Colour hex values in the old table are superseded by `client/src/styles/tokens.css`.

## 2b. Visual language (original v1, superseded by section 2; kept for reference)

### 2.1 Colour

| Token | Hex | Use |
|---|---|---|
| `--color-primary` | `#4f46e5` (indigo 600) | Primary buttons, links, active nav, focus ring |
| `--color-primary-soft` | `#eef2ff` | Selected rows, active nav background |
| `--color-bg` | `#f8fafc` | Page background |
| `--color-surface` | `#ffffff` | Cards, tables, modals |
| `--color-border` | `#e2e8f0` | Card and input borders, dividers |
| `--color-text` | `#0f172a` | Body text (contrast 17:1) |
| `--color-text-muted` | `#475569` | Secondary text, labels (contrast 7.6:1) |
| `--color-success / warning / danger / info` | green 700 / amber 700 / red 700 / blue 700 | Toasts, validation, reminders |

**Stage colours.** These are the core visual system of the app. Each pairs a dark text colour with a soft background, and every pair passes WCAG AA (≥ 4.5:1).

| Stage | Text | Background | Icon suggestion |
|---|---|---|---|
| Applied | `#1d4ed8` blue | `#dbeafe` | paper-plane |
| Aptitude Test | `#b45309` amber | `#fef3c7` | pencil / clipboard |
| Interview | `#6d28d9` violet | `#ede9fe` | users / chat |
| Offer | `#15803d` green | `#dcfce7` | check-circle |
| Rejected | `#b91c1c` red | `#fee2e2` | x-circle |

Use them with the ready-made `.badge.badge--{stage}` classes in `global.css`.

### 2.2 Typography

Inter (loaded in `index.html`), falling back to the system UI font.

| Token | Size | Use |
|---|---|---|
| `--text-2xl` | 32px / 700 | Stat numbers, page hero |
| `--text-xl` | 24px / 600 | Page titles (`h1` in app pages) |
| `--text-lg` | 18px / 600 | Card titles, section headings |
| `--text-base` | 16px / 400 | Body and inputs (16px stops iOS from zooming on inputs) |
| `--text-sm` | 14px | Table cells, helper and error text |
| `--text-xs` | 12px / 600 | Badges, captions, column counts |

Money is formatted as `₹6.5 LPA`. Dates are written as `15 Nov 2026`, and deadlines as relative time plus the date: `2 days left · 15 Nov`. Put the formatters in `client/src/utils/format.js` so both UIs match.

### 2.3 Spacing, shape and depth

- 4px spacing scale (`--space-1` … `--space-12`). Card padding is `--space-5`; the gap between cards is `--space-4`; spacing between page sections is `--space-8`.
- Radius: inputs and buttons `--radius-sm`; cards `--radius-md`; modals `--radius-lg`; badges `--radius-pill`.
- Shadows: cards at rest `--shadow-sm`, on hover `--shadow-md`; modals and dropdowns `--shadow-lg`.

## 3. Layout

### 3.1 App shell (`components/layout/AppShell`, owned by admin-ui)

```
Desktop (≥1024px)                                   Mobile (<768px)
┌───────────┬──────────────────────────────────┐    ┌──────────────────────────┐
│ ◆ Placement│  Page title          [user ▾]   │    │ ☰  PlacementTrack   (A) │  ← top bar 56px
│   Track    ├──────────────────────────────────┤    ├──────────────────────────┤
│            │                                  │    │                          │
│ ▸ Dashboard│   content (max-width 1200px)     │    │   content                │
│ ▸ Drives   │                                  │    │   (16px side padding)    │
│ ▸ My Apps  │                                  │    │                          │
│            │                                  │    ├──────────────────────────┤
│ [Logout]   │                                  │    │ ⌂ Home  ▤ Drives  ▦ Apps │  ← bottom nav (student)
└───────────┴──────────────────────────────────┘    └──────────────────────────┘
 sidebar 240px                                        sidebar becomes a ☰ drawer
```

- Student nav: Dashboard, Drives, My Applications.
- Admin nav: Dashboard, Drives, (Applicants are reached from a drive).
- Show the active nav item with `--color-primary-soft` background and `--color-primary` text.
- Breakpoints: `sm 640`, `md 768`, `lg 1024`, `xl 1280`. Write mobile-first CSS.

## 4. Key screens (wireframes)

### 4.1 Login / Register (student-ui)

```
┌─────────────────────────────────────────────┐
│               ◆ PlacementTrack              │
│        Track every drive. Miss nothing.     │
│  ┌───────────────────────────────────────┐  │
│  │ Email                                 │  │
│  │ [ asha@college.edu                  ] │  │
│  │ Password                       [show] │  │
│  │ [ ••••••••                          ] │  │
│  │ ⚠ Email or password is incorrect      │  │  ← error under the form, role="alert"
│  │ [        Log in  (primary, full)    ] │  │
│  │ New here? Create an account →         │  │
│  └───────────────────────────────────────┘  │
│        Placement officer? Admin login →     │
└─────────────────────────────────────────────┘
```
Register uses a two-column grid on desktop (Name | Email, Roll no. | Branch, CGPA | Backlogs, Grad year | Phone) and one column on mobile. Show the password rule as live helper text. Disable the submit button and show a spinner while the request is in flight.

The admin login (admin-ui) uses the same card with an "Officer portal" eyebrow label and no register link.

### 4.2 Student dashboard (student-ui)

```
Hi Asha 👋                                         
┌─ ⏰ Deadlines coming up ───────────────────────────────────────┐
│ ● TCS · Ninja              ends in 18h      [View & apply →] │  ← danger (<24h)
│ ● Wipro · Project Engineer ends in 2 days   [View & apply →] │  ← warning (<72h)
└──────────────────────────────────────────────────────────────┘
┌ Applied 3 ┐┌ Aptitude 1 ┐┌ Interview 1 ┐┌ Offer 0 ┐┌ Rejected 1 ┐   ← clickable summary chips
Upcoming drive dates
  Infosys · Systems Engineer — Aptitude on Sat, 1 Nov
```
If there are no reminders, show a calm success state: "You're all caught up. No deadlines in the next 3 days."

### 4.3 Drive listing (student-ui)

```
Drives                                            
[🔍 Search company or role        ] [Job type ▾] [Min ₹ ▾] [☑ Eligible only]
┌──────────────────────────┐ ┌──────────────────────────┐ ┌───────────────
│ INFOSYS          Eligible│ │ GOOGLE       Not eligible│ │ ...
│ Systems Engineer         │ │ SWE Intern               │
│ ₹6.5 LPA · Bengaluru     │ │ ₹1.2L/mo · Hyderabad     │
│ Full-time                │ │ Internship               │
│ ⏰ 2 days left · 15 Nov   │ │ ⏰ 9 days left · 22 Nov   │
│ [View details]  Applied ✓│ │ [View details]           │
└──────────────────────────┘ └──────────────────────────┘
```
Grid: 1 column under 640px, 2 columns from 640px, 3 columns from 1024px. Use skeleton cards while loading, not a blank page.

### 4.4 Drive details (student-ui)

The header shows company, role, package and the deadline countdown. Below it:
- an **Eligibility checklist** that compares the student's profile to each criterion (`✓ CGPA 8.4 ≥ 7.0`, `✗ Backlogs 1 > 0`)
- the description
- a sticky Apply bar at the bottom on mobile

Apply button states:

| State | Button |
|---|---|
| Can apply | **Apply now** (primary) → confirm dialog |
| Applying | spinner, disabled |
| Applied | "Applied ✓" (success, disabled) + "Track on board →" link |
| Not eligible | disabled, with the failed criteria listed above it |
| Deadline passed / closed | disabled, "Applications closed on 15 Nov" |

### 4.5 Kanban tracker (student-ui)

```
My Applications                                     6 total
┌ Applied · 3 ─────┐┌ Aptitude Test · 1 ┐┌ Interview · 1 ┐┌ Offer / Rejected · 1 ┐
│┌────────────────┐││┌─────────────────┐││┌─────────────┐││┌──────────────────┐  │
││Infosys         ││││Wipro            ││││Accenture    ││││TCS     Rejected  │  │
││Systems Engineer││││Project Engineer ││││ASE          ││││Ninja             │  │
││₹6.5 LPA        ││││₹3.5 LPA         ││││₹4.5 LPA     ││││at Aptitude       │  │
││Applied 28 Oct  ││││Test on 1 Nov    ││││📝 notes     ││││                  │  │
│└────────────────┘││└─────────────────┘││└─────────────┘││└──────────────────┘  │
```
- **Four columns**, matching the brief: Applied, Aptitude Test, Interview, Offer/Rejected. The last column shows an Offer or Rejected badge on each card, and "at {stage}" for rejections (from `stageHistory`).
- Students **can't drag** cards, because only the officer changes stages. This is deliberate: the board reflects official status.
- Clicking a card opens a **right-side drawer** (full-screen sheet on mobile) with the stage timeline and the **Notes editor**.
- Mobile: columns scroll horizontally with CSS `scroll-snap-type: x mandatory`, each column at 85% of the viewport width so the next column peeks in. Alternative: stage tabs.
- Show a 📝 icon on cards that have notes.

### 4.6 Notes editor (student-ui)

A textarea (min 8 rows) with a `1234 / 5000` counter. Save with a **Save** button plus `Ctrl/⌘+S`. Show a status line: "Saved · 2 min ago" / "Unsaved changes" / "Saving…". Before closing the drawer with unsaved changes, ask "Discard changes?". Render notes as plain text (`white-space: pre-wrap`), never with `dangerouslySetInnerHTML`.

### 4.7 Admin dashboard (admin-ui)

```
Dashboard                                   [Grad year: 2027 ▾]
┌ Students ┐┌ Open drives ┐┌ Applications ┐┌ Placed ┐┌ Placement rate ┐┌ Highest pkg ┐
│   412    ││      6      ││    1,290     ││   69   ││     16.7%      ││  ₹24 LPA    │
└──────────┘└─────────────┘└──────────────┘└────────┘└────────────────┘└─────────────┘
┌ Applications by stage (horizontal bar) ──┐┌ Placed vs total by branch (bar) ───────┐
│ Applied    ████████████████  610         ││ CSE  ████░░░░░░  31/120               │
│ Aptitude   ███████  280                  ││ ECE  ██░░░░░░░░  12/80                │
│ ...                                      ││ ...                                   │
└──────────────────────────────────────────┘└───────────────────────────────────────┘
┌ Top drives by applicants ────────────────┐┌ Upcoming deadlines ────────────────────┐
```
Stat cards: 2 per row on mobile, 3 on tablet, 6 on desktop. Bar charts use the stage colours. A simple CSS bar chart is fine; a chart library such as Recharts is optional. Every chart also shows its numbers as text.

### 4.8 Manage drives (admin-ui)

A table with columns Company, Role, Package, Deadline, Status, Applicants and Actions (Edit · Applicants · Delete) and a **+ New drive** primary button at the top right. Below 768px the table turns into stacked cards. Delete opens a ConfirmDialog: "Delete Infosys – Systems Engineer? This also removes 37 applications. This can't be undone." with a red **Delete** button. Focus starts on Cancel.

### 4.9 Drive form (admin-ui)

Sections: **Company & role** · **Compensation & location** · **Eligibility** (min CGPA, branch chips with "All branches" toggle, graduation year, max backlogs) · **Dates** (deadline, drive date). Errors appear inline under each field once it has been touched. Footer: Cancel (secondary) and Save drive (primary). If the user leaves with unsaved changes, ask them to confirm.

### 4.10 Applicants (admin-ui)

```
Infosys · Systems Engineer                                   37 applicants
[All 37] [Applied 20] [Aptitude 10] [Interview 4] [Offer 1] [Rejected 2]   ← stage tabs with counts
[🔍 Search name or roll no.]
┌──────────────┬──────────┬──────┬──────┬──────────────┬──────────────────────────┐
│ Name         │ Roll no. │Branch│ CGPA │ Applied      │ Stage                    │
├──────────────┼──────────┼──────┼──────┼──────────────┼──────────────────────────┤
│ Asha Rao     │ 21CS045  │ CSE  │ 8.4  │ 28 Oct       │ [Aptitude] [Move to ▾]   │
└──────────────┴──────────┴──────┴──────┴──────────────┴──────────────────────────┘
```
"Move to" shows one button for the next stage (e.g. **Interview →**) plus a **Reject** button. Only valid next stages are offered. Both open a small dialog showing `current stage → new stage` with an optional remark that appears on the student's timeline. Rejection is marked as final. Stage changes can't be undone (the API only moves forward), so the dialog is the safety net.

## 5. Components and states checklist

Every data-driven view must handle **all four states**:

| State | Pattern |
|---|---|
| Loading | Skeletons for lists and cards; a spinner inside the button for actions |
| Empty | `EmptyState`: icon, one-line explanation, primary action |
| Error | Inline banner with the API `message` and a **Retry** button |
| Success | The content; toasts confirm mutations (bottom-right on desktop, bottom-centre on mobile, 4s, `role="status"`) |

Buttons: `primary` (one per view), `secondary` (outlined), `ghost` (text), `danger`. Height 40px (44px on touch screens), with a visible `:focus-visible` ring.

## 6. Implemented extras

| Feature | Where | Why |
|---|---|---|
| **Dark mode** | Theme toggle in the top bar and on auth pages; follows the system setting by default | Late-night prep sessions; every token has a dark value in `tokens.css` |
| **Company monograms** | `CompanyAvatar`: initials on a colour derived from the company name | Drives are recognisable at a glance without logos |
| **Progress dots** on Kanban cards | `ApplicationCard` | Shows how far each application got, including where a rejection happened |
| **Calendar sync** | "Sync to calendar" on the dashboard and board | Deadlines and drive days show up in Google or Apple Calendar with alerts |
| **Placement funnel** | Admin dashboard | Shows which round students drop out at |
| **Student preview** | Drive form sidebar | The officer sees exactly how the drive card will look to students |
| **"Waking up the server" banner** | Global | Explains the Render free-tier cold start instead of looking broken |
| **`/` to search** | Drives, admin drives, applicants | Keyboard shortcut familiar from GitHub and YouTube |
| **Shareable filters** | Drives and applicants keep filters in the URL | Back/forward and copied links keep the same view |
| **CSV export** | Applicants page | Share a shortlist with the company |
| **Unsaved-changes guards** | Notes drawer and drive form | No lost work |

## 7. Accessibility checklist (check every PR)

- [ ] All text meets 4.5:1 contrast (the tokens already do; don't put muted text on coloured backgrounds)
- [ ] Every input has a `<label>`; errors are linked with `aria-describedby`
- [ ] Every interactive element works by keyboard; the focus ring is visible; modals trap focus and close on `Esc`
- [ ] Icons-only buttons have an `aria-label`
- [ ] Stage is shown as text, not only colour
- [ ] Page `<title>` updates per route (e.g. "Drives · PlacementTrack")
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Touch targets are at least 44×44px on mobile

## 8. Microcopy

| Situation | Text |
|---|---|
| Apply confirm | "Apply to **Infosys – Systems Engineer**? Your profile will be shared with the placement cell." |
| Apply success | "Applied to Infosys. Track it on your board." |
| Not eligible | "You don't meet: CGPA ≥ 7.0" |
| No drives | "No open drives match your filters." + [Clear filters] |
| No applications | "You haven't applied anywhere yet." + [Browse drives] |
| Session expired | "Your session expired. Please log in again." |
| Generic error | "Something went wrong. Please try again." (never show raw errors) |

Use sentence case everywhere ("Create drive", not "Create Drive").
