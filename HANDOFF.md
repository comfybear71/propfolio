# HANDOFF.md - Session Continuity Notes

> Use this file to pass context between Claude sessions. Update it at the end of each session or when significant progress is made.

---

## Last Updated
2026-04-09

## Last Session Summary (2026-04-09)
Major session — authentication, mobile UI, data persistence, OCR:

### Authentication System
- Added NextAuth v5 with Google OAuth + email/password login
- Login page at `/login` with Google button + email form
- AuthGuard component redirects unauthenticated users
- All 10+ API routes now filter by userId
- Migration endpoint (`POST /api/migrate`) claims existing data
- Migrate button on dashboard (run once, then can be removed)

### Discover Page (Property Swipe)
- Rebuilt for mobile-first: compact search form, minimal UI
- Search results in-memory only — no DB save until liked
- Smooth swipe animation with deferred DB save (prevents glitch)
- Image preloading for next 3 cards
- Smart touch detection (horizontal = swipe, vertical = scroll)
- Auto-load more results when 5 from end
- Watchlist cards tappable to open listing URL
- Removed Domain API toggle — RapidAPI only

### Data Persistence
- Borrowing page inputs auto-save to MongoDB (800ms debounce)
- Strategy page plan/assumptions auto-save to MongoDB
- Both pages now use DB hooks instead of hardcoded data.ts

### Payslip OCR
- New `/api/ocr-payslip` endpoint using Claude Sonnet vision
- Auto-triggers when uploading Income & Employment documents
- Extracts: name, employer, gross/net pay, YTD, super, tax, allowances

### Mobile Fixes
- Proper Viewport export with userScalable=false
- Smart touch handling, responsive padding, overflow-x-hidden

## Current Branch
`claude/review-handoff-safety-tY8ju`

## What's Working
- Login (Google + email), per-user data isolation
- Dashboard, Properties, Finances, Assets, Discover, Borrowing, Strategy, Documents, Roadmap, Tax Guide
- Document upload (Vercel Blob) + payslip OCR
- RapidAPI property search + swipe

### Additional Work (later in session)
- Document upload working with Vercel Blob (private store)
- General OCR for ALL document types (ID, bank, loans, insurance, etc.)
- Payslip OCR auto-populates income fields (gross, net, employer, job title)
- Bank statement OCR categorises all transactions into expense categories
- Broker Pack ZIP download button
- Dashboard "Next Property" progress tracker (75% ready to buy)
- Fixed mobile layout for iPhone (documents page, filters, summary cards)
- Fixed desktop layout after mobile changes

## What's Not Done Yet
- [ ] Email broker pack directly to broker
- [ ] Smart file naming (Person_DocumentType.pdf)
- [ ] Charts/graphs (Recharts)
- [ ] First-time user setup wizard (generic templates for new users)
- [ ] Remove Migrate/Seed buttons after use
- [ ] Password hashing (needs bcrypt)
- [ ] Duplicate income record cleanup (OCR creates new vs updating existing)

## Notes for Next Claude
- Read `CLAUDE.md` first for full context
- Auth uses `getAuthDb()` from `@/lib/apiAuth` — returns { db, userId } or 401
- User tests on propfolio.work directly
- Mobile-first is critical (iPad/iPhone)
- `.npmrc` with `legacy-peer-deps=true` required for Vercel
- No middleware.ts — deprecated in Next.js 16
