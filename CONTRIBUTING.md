# Contributing to PlacementTrack

Three people work on this repo in parallel. These rules keep `main` working and stop us overwriting each other's work.

## The rules

1. **Never commit directly to `main`.** `main` only changes through reviewed pull requests.
2. **Work only on your own feature branch.**

   | Branch | Owner | Folders you own |
   |---|---|---|
   | `feature/backend-api` | Raghav (@Raghavnv) | `server/`, `docs/postman/` |
   | `feature/student-ui` | Teammate 1 (@Puneethbin) | `client/src/pages/student`, `client/src/pages/auth/{Login,Register}Page.jsx`, `client/src/components/student` |
   | `feature/admin-ui` | Teammate 2 (@pranavmohan10-kaizen) | `client/src/pages/admin`, `client/src/pages/auth/AdminLoginPage.jsx`, `client/src/components/{admin,layout}`, `client/src/context`, `client/src/services/api.js`, `client/src/App.jsx` |

   Shared files (`client/src/styles/*`, `client/src/components/common/*`, `client/src/utils/*`, `docs/*`): tell the team in the group chat before changing them, and keep those changes small.
3. **Pull the latest `main` and merge it into your branch every day** (see the daily workflow below).
4. **Prefix every commit message:**

   | Prefix | Use for | Example |
   |---|---|---|
   | `feat:` | New feature | `feat: add kanban board columns` |
   | `fix:` | Bug fix | `fix: reject stage skip from applied to interview` |
   | `docs:` | Documentation | `docs: add reminders endpoint to api contract` |
   | `test:` | Tests | `test: cover apply-to-drive error cases` |
   | `chore:` | Setup, config, refactors, deps | `chore: add eslint config` |

   Use the imperative mood ("add", not "added") and keep the subject under 72 characters.
5. **When a feature is done, open a PR into `main` and get one teammate's review** before merging. The author merges after approval.
6. **Never commit `.env` files.** Only `.env.example` (with fake values) goes in git. If you commit a secret by accident, tell the team immediately and rotate it (e.g. change `JWT_SECRET` and the Atlas password). Deleting the file in a later commit does not remove it from history.

## First-time setup

```bash
git clone https://github.com/Raghavnv/placement-track.git
cd placement-track
git checkout <your-branch>          # e.g. feature/student-ui
cd server && cp .env.example .env && npm install && cd ..
cd client && cp .env.example .env && npm install && cd ..
```

## Daily workflow

```bash
# 1. Start of day: bring main's latest changes into your branch
git checkout main
git pull origin main
git checkout feature/<your-branch>
git merge main                      # fix any conflicts, then commit the merge
git push

# 2. Work in small commits
git add <files>
git commit -m "feat: add drive card component"
git push

# 3. Feature done: open a PR
gh pr create --base main --fill     # or use the GitHub website
```

Resolving merge conflicts: open the files VS Code highlights, keep the right code from both sides, run the app or tests, then `git add` and `git commit`. If you're unsure whose code wins, ask the owner of that file.

## Pull requests

- Keep PRs small, around one issue each (under ~400 changed lines makes them much easier to review).
- Fill in the PR template, link the issue (`Closes #12`) and add screenshots for UI changes (mobile and desktop).
- **Reviewer:** pull the branch and run it. Check it against the API contract and the UI design guide. Leave specific comments. Approve when it's good enough, not perfect.
- After merging, **all three** merge `main` into their branches that day.
- Don't force-push to a branch someone else is reviewing.

## Coding standards

### General
- Match `docs/api-contract.md` exactly. If the contract needs to change, update it **in the same PR** and tell the team.
- No secrets, no `console.log` left in committed code (the server startup log is fine), and no commented-out blocks.
- Use descriptive names: `applicationController.updateStage`, not `ctrl.upd`.

### Server
- Folders: `routes` → `middleware` → `controllers` → `models`. Business rules go in `utils/` (e.g. `stages.js`, `eligibility.js`) so they can be unit-tested.
- Wrap async controllers with `asyncHandler` and throw `ApiError` for expected errors.
- Every endpoint gets a Jest + Supertest test for the success path and its main errors. Run `npm test` before pushing.

### Client
- Function components and hooks. One component per file, PascalCase file names (`DriveCard.jsx`).
- Use the CSS variables from `styles/tokens.css`; never hard-code colours or font sizes.
- Every page handles loading, empty, error and success states (see `docs/ui-design.md` §5).
- Call the API only through `services/*`, never with `axios` directly inside components.
- Run `npm run build` before opening a PR.

## Issues and labels

| Label | Meaning |
|---|---|
| `backend` | Server work (`feature/backend-api`) |
| `student-ui` | Student pages (`feature/student-ui`) |
| `admin-ui` | Admin pages, shared layout and routing (`feature/admin-ui`) |
| `docs` | Documentation |
| `bug` | Something is broken |
| `enhancement` | New feature or improvement |

Assign yourself before starting an issue, and move it forward by linking it in your PR.
