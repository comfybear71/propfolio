# HANDOFF.md - Session Continuity Notes

> Use this file to pass context between Claude sessions. Update it at the end of each session or when significant progress is made.

---

## Last Updated
2026-04-13 (end of session)

## Current Session Summary (2026-04-13)
Major feature: First-time user setup wizard + Domain.com.au API integration + OCR cleanup.

### Setup Wizard (/setup) — NEW
- 4-step onboarding wizard for new users
- Step 1: Upload payslip PDF per person → OCR extracts name, employer, income (no manual name entry needed). Can add multiple people.
- Step 2: Enter property addresses → manual entry with Domain API autocomplete ready (pending access approval)
- Step 3: Enter loan balance, interest rate, offset, bank savings, property value
- Step 4: Summary with borrowing power, equity, portfolio overview
- On completion: saves to incomes, properties, loans, assets collections → redirects to dashboard
- First-time detection: dashboard redirects to /setup if no income data + no setupComplete flag
- NavBar hidden on /setup for clean wizard experience

### Domain.com.au API Integration — NEW (Pending Access)
- Shared OAuth token helper at `src/lib/domainApi.ts`
- `GET /api/domain-suggest?terms=...` — address autocomplete (built, waiting for Domain approval)
- `GET /api/domain-property?id=...` — full property details + price estimate + suburb stats (built, waiting)
- Existing `/api/domain-search` refactored to use shared token helper
- **Access status:** Contact form submitted to api@domain.com.au. Address Suggestions, Properties & Locations, Rental AVM all requested. Currently only Listings Management (Sandbox) is active.
- **Credentials on Vercel:** DOMAIN_CLIENT_ID + DOMAIN_CLIENT_SECRET configured
- **API Key also created:** key_7a2d175022ed4f39... (on Domain portal)
- Manual entry works as fallback — Domain API will auto-activate when approved

### OCR Cleanup
- DELETED `/api/ocr-document` — general document OCR removed entirely
- KEPT `/api/ocr-payslip` — only OCR in the app, used by setup wizard Step 1
- Documents page cleaned: upload + save only, no OCR buttons or auto-scanning
- Users enter expenses manually (no bank statement OCR)

### Bug Fixes
- Property value field disappearing while typing (tracked API vs manual separately)
- Manual address entry enabled (onBlur confirms typed address)

### Known Issue: Duplicate Records
- Running the setup wizard when data already exists creates duplicate properties/loans/incomes
- Stuart tested and got duplicates of both properties on the dashboard
- **Needs CRUD delete buttons or dedup logic next session**

## Previous Sessions
- **2026-04-09:** Authentication, mobile UI, data persistence, payslip OCR, Discover page swipe, Broker Pack ZIP
- **2026-04-10:** Safety rules, code preservation protocol

## Current Branch
All work merged to `master`. No active feature branch.

## Tags
- `v0-baseline-2026-04-10`
- `v1.0-2026-04-10`
- `v1.0.1-2026-04-13` — doc updates
- `v1.1.0-2026-04-13` — setup wizard + Domain API
- `v1.1.1-2026-04-13` — payslip-first wizard flow
- `v1.1.2-2026-04-13` — manual address entry fix
- `v1.1.3-2026-04-13` — value field fix

## What's Working
- Login (Google + email), per-user data isolation
- **Setup wizard** for new users (payslip OCR + manual address/value entry)
- Dashboard with "Next Property" progress tracker
- Properties, Finances, Assets pages (CRUD, per-user)
- Discover page (RapidAPI search + Tinder-style swipe + watchlist)
- Borrowing calculator (auto-saves inputs)
- Strategy planner (auto-saves plan)
- Documents page (broker checklist + file upload, no OCR)
- Roadmap, Tax Guide pages
- Payslip OCR (setup wizard only)
- Broker Pack ZIP download
- Domain API code ready (activates when access approved)

## What's Not Done Yet — Next Session Priorities
- [ ] **CRUD delete for properties/loans/incomes** — remove duplicate test data
- [ ] **Investment/Home toggle on Discover page** — investors see yield, home buyers see schools/suburb stats
- [ ] **Wire up Domain API when approved** — autocomplete, property details, rental yield
- [ ] **Switch Discover to Domain API** (replace or supplement RapidAPI)
- [ ] Domain API: rich listing data (yield via `annualReturn`, tenant info, comparable sales, `isNewDevelopment` flag)
- [ ] Email broker pack directly to broker
- [ ] Charts/graphs (Recharts)
- [ ] Password hashing (needs bcrypt)
- [ ] Private blob file viewing (needs download proxy with Bearer token — different project context)

## Domain API — What We Learned
- Sandbox mode = tier-based restriction, not separate environment
- Free Innovation tier: 500 calls/day, limited endpoints
- Address Suggestions, Properties & Locations, Rental AVM all need manual approval
- Listings search (`POST /v1/listings/residential/_search`) also needs approval
- Rich listing data available: `annualReturn` (yield), `rentalDetails`, `tenantDetails`, `isNewDevelopment`, `suburbMedianPrice`, `comparableData`, photos, geo, features
- Contact: api@domain.com.au — use case submitted

## Notes for Next Claude
- Read `CLAUDE.md` first for full context
- Auth uses `getAuthDb()` from `@/lib/apiAuth` — returns { db, userId } or 401
- User tests on propfolio.work directly
- Mobile-first is critical (iPad/iPhone)
- `.npmrc` with `legacy-peer-deps=true` required for Vercel
- No middleware.ts — deprecated in Next.js 16
- Vercel Blob files are **private** — need Bearer token to fetch by URL
- OCR is ONLY for payslips. Do NOT add OCR to other documents.
- Domain API access is PENDING — code is ready, just needs approval
- **Stuart has duplicate data** from testing the setup wizard — first priority is CRUD delete
