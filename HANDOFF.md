# HANDOFF.md - Session Continuity Notes

> Use this file to pass context between Claude sessions. Update it at the end of each session or when significant progress is made.

---

## Last Updated
2026-04-13

## Current Session Summary (2026-04-13)
Major feature: First-time user setup wizard + Domain.com.au API integration.

### Setup Wizard (/setup) — NEW
- 5-step onboarding wizard for new users
- Step 1: Enter names of all investors (any number of people)
- Step 2: Upload payslip PDF per person → OCR extracts income automatically
- Step 3: Enter property addresses → Domain API autocomplete fetches details + price estimate
- Step 4: Enter loan balance, interest rate, offset, bank savings
- Step 5: Summary with borrowing power, equity, portfolio overview
- On completion: saves to incomes, properties, loans, assets collections → redirects to dashboard
- First-time detection: dashboard redirects to /setup if no income data + no setupComplete flag
- NavBar hidden on /setup for clean wizard experience

### Domain.com.au API Integration — NEW
- Shared OAuth token helper at `src/lib/domainApi.ts`
- `GET /api/domain-suggest?terms=...` — address autocomplete
- `GET /api/domain-property?id=...` — full property details + price estimate + suburb stats
- Existing `/api/domain-search` refactored to use shared token helper
- Scopes: api_properties_read, api_listings_read, api_suburbperformance_read, api_demographics_read, api_salesresults_read, api_addresslocators_read
- User has Domain Developer Portal set up (Sandbox mode) with OAuth credentials

### OCR Cleanup
- DELETED `/api/ocr-document` — general document OCR removed entirely
- KEPT `/api/ocr-payslip` — only OCR in the app, used by setup wizard
- Documents page cleaned: upload + save only, no OCR buttons or auto-scanning
- Users enter expenses manually (no bank statement OCR)

### Files Created
- `src/lib/domainApi.ts` — Domain API shared OAuth + typed endpoint wrappers
- `src/app/api/domain-suggest/route.ts` — address autocomplete endpoint
- `src/app/api/domain-property/route.ts` — property details endpoint
- `src/app/setup/page.tsx` — setup wizard main page
- `src/components/setup/types.ts` — shared wizard types
- `src/components/setup/StepWelcome.tsx` — step 1
- `src/components/setup/StepPayslips.tsx` — step 2
- `src/components/setup/StepProperties.tsx` — step 3
- `src/components/setup/StepFinances.tsx` — step 4
- `src/components/setup/StepResults.tsx` — step 5

### Files Modified
- `src/app/api/domain-search/route.ts` — refactored to use shared token
- `src/app/page.tsx` — added first-time user redirect to /setup
- `src/app/documents/page.tsx` — removed all OCR logic, upload-only now
- `src/components/NavBar.tsx` — hide on /setup page
- `src/components/AuthGuard.tsx` — allow /setup page
- `CLAUDE.md` — updated project structure, tech stack, env vars
- `HANDOFF.md` — this file

### Files Deleted
- `src/app/api/ocr-document/route.ts` — general document OCR removed

## Previous Session (2026-04-09)
Authentication, mobile UI, data persistence, payslip OCR, Discover page swipe, Broker Pack ZIP.

## Current Branch
`claude/fix-ocr-private-blob-auth-itbcD`

## What's Working
- Login (Google + email), per-user data isolation
- **Setup wizard** for new users (payslip OCR + Domain API address lookup)
- Dashboard with "Next Property" progress tracker
- Properties, Finances, Assets pages (CRUD, per-user)
- Discover page (RapidAPI search + Tinder-style swipe + watchlist)
- Borrowing calculator (auto-saves inputs)
- Strategy planner (auto-saves plan)
- Documents page (broker checklist + file upload, no OCR)
- Roadmap, Tax Guide pages
- Payslip OCR (setup wizard only)
- Broker Pack ZIP download
- Domain API: address autocomplete + property details + price estimates

## What's Not Done Yet
- [ ] Email broker pack directly to broker
- [ ] Smart file naming (Person_DocumentType.pdf)
- [ ] Charts/graphs (Recharts)
- [ ] Remove Migrate/Seed buttons after use
- [ ] Password hashing (needs bcrypt)
- [ ] Domain API: request access to Price Estimation (Business tier) for live property values
- [ ] Domain API: suburb performance stats (needs suburbId resolution)
- [ ] Mobile testing of setup wizard

## Environment Variables Needed
- `DOMAIN_CLIENT_ID` — Domain.com.au OAuth client ID
- `DOMAIN_CLIENT_SECRET` — Domain.com.au OAuth client secret
- Both need to be added to Vercel environment variables

## Notes for Next Claude
- Read `CLAUDE.md` first for full context
- Auth uses `getAuthDb()` from `@/lib/apiAuth` — returns { db, userId } or 401
- User tests on propfolio.work directly
- Mobile-first is critical (iPad/iPhone)
- `.npmrc` with `legacy-peer-deps=true` required for Vercel
- No middleware.ts — deprecated in Next.js 16
- Vercel Blob files are **private** — need Bearer token to fetch by URL
- OCR is ONLY for payslips. Do NOT add OCR to other documents.
- Domain API is in Sandbox mode — returns test data until upgraded
- Existing tags: `v0-baseline-2026-04-10`, `v1.0-2026-04-10`
