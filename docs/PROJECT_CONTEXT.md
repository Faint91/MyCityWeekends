MyCityWeekends — PROJECT CONTEXT PACK (Upload this to a new chat)
Audience: ChatGPT (engineering partner). Purpose: restore full project context if chat becomes laggy/too long.
Timezone: America/Vancouver
Last updated: 2026-02-28

======================================================================
1) PRODUCT VISION (WHAT WE'RE BUILDING)
======================================================================

Name: MyCityWeekends (starting in Vancouver, BC; scalable to other cities later)

Core promise (MVP): “What can I do this weekend (budget edition)?”
- User lands on site and, within ~10–30 seconds, finds 3 cheap/free high-quality options for the upcoming weekend.
- Low friction: no login required to browse.
- Mobile-first UX with bottom navigation.
- Fast loading and reliable; SEO-friendly.

Target persona (first wedge): Students / budget-conscious residents in Vancouver.
Content focus: free/cheap events and activities (later may expand).

Approach: “Decision format” not “Directory format.”
- Curate and present a small set of high-quality picks that are easy to choose from (Top 3 + sections like Free / Under $15).
- Not trying to compete head-on with Eventbrite globally; complementary layer with curated picks, linking out as needed.

Publishing strategy:
- Phase 1: curated by founder (user) to maintain quality.
- Submissions: later as “Suggest an event” (moderated queue), not auto-publish.

======================================================================
2) KEY UX DECISIONS
======================================================================

- Mobile-first always; implement mobile baseline first, enhance for desktop with breakpoints.
- Bottom navigation chosen (instead of hamburger):
  Likely tabs: Weekend / Free / Under $15 (and later Saved).
- Pages planned for MVP:
  1) Homepage / “This Weekend (Budget Picks)” showing Top 3 + sections.
  2) Free This Weekend
  3) Under $15
  4) Event detail page (shareable, SEO-friendly)

Event card content (decision info):
- Title
- Price badge (Free / $ / $$; specifically Free / Under $15 / Under $30 later)
- Time block (Fri night / Sat day / Sun)
- Location (venue/neighborhood, eventually transit-friendly note)
- 1-line “Why it’s worth it” editorial note
- Link out (ticket/official page) when relevant

======================================================================
3) “BEST OVERALL” ARCHITECTURE WE CHOSE
======================================================================

Single Next.js app (full-stack) + embedded CMS + Postgres.

- Next.js (React) app (App Router) for SEO + speed (pre-render where possible).
- Payload CMS installed in Next.js:
  - Admin panel for editorial workflow (Weekend Drops, Events).
  - Draft/publish states, access control, moderation queue later.
- Postgres database hosted on Neon (free tier for MVP).
- Package manager: pnpm (monorepo/workspace compatibility).
- Hosting: Vercel (Hobby free) for prod deploy.
- Analytics choice: GA4 (Google Analytics) to be integrated later once key pages exist.

Notes:
- Windows PowerShell execution policy blocked npx.ps1; used CMD terminal.
- The scaffold uses workspace:* deps; npm install fails; pnpm is required.

======================================================================
4) DEPLOYED CURRENT STATE
======================================================================

Repo: GitHub “Faint91/MyCityWeekends”
Prod URL: https://my-city-weekends.vercel.app/
Admin route: /admin works
CI: GitHub Actions Playwright workflow runs green on push.

Secrets hygiene:
- GitGuardian flagged secrets earlier (Postgres URI + generic high entropy secret).
- Secrets were rotated/removed; now “all good.”
- Keep env files gitignored; store secrets only in:
  - Vercel env vars
  - GitHub Actions secrets (only if needed)
  - local .env.local/.env.e2e (never committed)

======================================================================
5) TOOLCHAIN (FREE) — REQUIRED
======================================================================

Local dev:
- VS Code
- Git
- Node.js LTS
- pnpm (via corepack enable; fallback npm i -g pnpm)
- Chrome DevTools Device Mode for mobile testing

Accounts/services (free tiers):
- GitHub (repo + Actions CI)
- Vercel (hosting)
- Neon (Postgres)

Testing:
- Playwright for E2E regression
- Vitest + React Testing Library for unit/component tests (installed; suite to be expanded)

Optional (later):
- Sentry (errors), Microsoft Clarity (session replay), Google Search Console (SEO), UptimeRobot (uptime).

======================================================================
6) TESTING & REGRESSION STRATEGY (SOLID)
======================================================================

Goal: strong regression safety so every feature addition is tested and CI gates merges/deploys.

Layers:
1) Lint (ESLint)
2) Typecheck (tsc)
3) Unit/component tests (Vitest + Testing Library) for logic + reusable UI components
4) E2E tests (Playwright) for user flows, including mobile viewport checks
5) (Optional later) screenshot visual regression for key pages

Playwright specifics:
- baseURL was required; relative /admin failed without it.
- Admin login test uses env vars:
    PLAYWRIGHT_ADMIN_EMAIL
    PLAYWRIGHT_ADMIN_PASSWORD
  These should come from GitHub Actions secrets in CI.
- Some templates had 'next/cache' import issues; fixed by using 'next/cache.js' where needed.
- Vercel build previously failed because playwright.config.ts had duplicate webServer keys; fixed by keeping only one and (if needed) excluding Playwright config from Next build typecheck scope via tsconfig excludes.

======================================================================
7) DEVELOPMENT LIFECYCLE (“LOCKED IN” PROCESS)
======================================================================

For every new feature:
0) Short feature brief:
   - Goal
   - Acceptance criteria (must include mobile behavior)
   - Non-goals / out of scope
1) List use cases; check complexity / mess-risk.
2) Split into small actions (mergeable tasks).
3) Define data & interfaces (types, API shapes; migrations if needed).
4) Implement tasks (keep app working at every step).
5) Tests:
   - Unit/component tests when there is logic or reusable components.
   - E2E test when user flow changes (always for nav/layout).
6) QA:
   - mobile widths (390/375/360) + desktop (1440)
   - no horizontal scroll; bottom nav not covering content.
7) Automated regression suite runs in CI.
8) Deploy to prod.
9) Post-deploy smoke test + monitor.
10) Rollback plan: revert last commit; prefer backwards-compatible migrations.

Documentation to maintain (to avoid chat bloat):
- docs/PROJECT_CONTEXT.md (this file’s evolving version)
- docs/UI_CHECKLIST.md
- docs/CHANGELOG_DEV.md
- docs/RUNBOOK_DEBUG.md

======================================================================
8) CURRENT TODOS (NEXT CODING STEPS)
======================================================================

Immediate build tasks:
1) UI foundation:
   - Bottom navigation component (mobile-first)
   - Layout shell
2) Payload collections and data model for MVP:
   - Event
   - Venue
   - WeekendDrop
   - WeekendDropItem (section + rank + editorial “why”)
3) Build first pages:
   - Weekend page (Top 3 + sections)
   - Free page
   - Under $15 page
   - Event detail page
4) Add baseline tests:
   - Component tests for BottomNav and EventCard
   - Playwright tests:
       - homepage loads (desktop)
       - homepage loads (mobile viewport) + no horizontal scroll + bottom nav visible
       - /admin login test (CI secrets required)
5) Add GA4 integration later once pages are stable:
   - env var NEXT_PUBLIC_GA_MEASUREMENT_ID
   - standard Next.js instrumentation (page views + key click events later)

======================================================================
9) IMPORTANT GOTCHAS / HISTORY (SO YOU DON’T REPEAT ISSUES)
======================================================================

- PowerShell ExecutionPolicy blocked npx.ps1; used CMD.
- npm install failed due to workspace:*; use pnpm.
- Playwright initially failed due to 'next/cache' import path; use 'next/cache.js' in the hook file(s).
- Playwright relative URL navigation required baseURL.
- Vercel build failed earlier due to duplicate webServer keys in playwright.config.ts; keep only one.
- Secrets accidentally committed earlier; rotated/removed; keep env files untracked.

======================================================================
10) WHAT THE ASSISTANT SHOULD DO IN A NEW CHAT
======================================================================

When this file is uploaded:
- Assume setup (local dev + prod + CI) is working and we’re ready to code features.
- Keep mobile-first and bottom nav in mind at all times.
- Follow the locked-in lifecycle process (brief → tasks → implement → tests → QA → regression → deploy).
- Prefer small, mergeable changes; always keep repo deployable.
- If logs are long, ask for them as files rather than pasted in chat.

