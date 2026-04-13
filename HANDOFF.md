# HANDOFF.md - Session Continuity Notes

> Use this file to pass context between Claude sessions. Update it at the end of each session or when significant progress is made.

---

## Last Updated
2026-04-13

## Previous Session Summary (2026-04-09)
Major session — authentication, mobile UI, data persistence, OCR:

### Authentication System
- Added NextAuth v5 with Google OAuth + email/password login
- Login page at `/login` with Google button + email form
- AuthGuard component redirects unauthenticated users
- All 10+ API routes now filter by userId
- Migration endpoint (`POST /api/migrate`) claims existing data

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

### OCR (Two Endpoints)
- `/api/ocr-payslip` — payslip-specific OCR using Claude Sonnet vision
- `/api/ocr-document` — general OCR for all document types (ID, bank statements, loans, insurance, super, rates, leases)
- Auto-triggers when uploading documents to the broker checklist
- Bank statement OCR categorises all transactions into expense categories

### Other Features Added
- Broker Pack ZIP download (`/api/broker-pack-download`)
- Dashboard "Next Property" progress tracker
- Fixed mobile layout for iPhone (documents page, filters, summary cards)

---

## Current Session (2026-04-13)
Branch: `claude/fix-ocr-private-blob-auth-itbcD`

### Session Focus
- Updated CLAUDE.md and HANDOFF.md to reflect current codebase state
- Identified that Vercel Blob files are stored with `access: "private"` — fetching these URLs from server-side code requires a Bearer token (`BLOB_READ_WRITE_TOKEN`)

### Known Issue: OCR + Private Blob Auth
- Files uploaded via `/api/files` are stored in Vercel Blob with `access: "private"`
- If any OCR route needs to fetch a file by URL (rather than receiving it as a direct upload), it must include `Authorization: Bearer <BLOB_READ_WRITE_TOKEN>` in the fetch headers
- Current OCR routes (`ocr-payslip`, `ocr-document`) receive files directly as formData uploads, so they work — but any future "re-OCR from stored URL" feature would need the auth header

## Current Branch
`claude/fix-ocr-private-blob-auth-itbcD`

## What's Working
- Login (Google + email), per-user data isolation
- Dashboard with "Next Property" progress tracker
- Properties, Finances, Assets pages (CRUD, per-user)
- Discover page (RapidAPI search + Tinder-style swipe + watchlist)
- Borrowing calculator (auto-saves inputs)
- Strategy planner (auto-saves plan)
- Documents page (broker checklist + file upload + OCR)
- Roadmap, Tax Guide pages
- Payslip OCR + General document OCR (all types)
- Broker Pack ZIP download

## What's Not Done Yet
- [ ] Email broker pack directly to broker
- [ ] Smart file naming (Person_DocumentType.pdf)
- [ ] Charts/graphs (Recharts)
- [ ] First-time user setup wizard (generic templates for new users)
- [ ] Remove Migrate/Seed buttons after use
- [ ] Password hashing (needs bcrypt)
- [ ] Duplicate income record cleanup (OCR creates new vs updating existing)
- [ ] Private blob auth for re-OCR from stored URL (if needed in future)

## Notes for Next Claude
- Read `CLAUDE.md` first for full context
- Auth uses `getAuthDb()` from `@/lib/apiAuth` — returns { db, userId } or 401
- User tests on propfolio.work directly
- Mobile-first is critical (iPad/iPhone)
- `.npmrc` with `legacy-peer-deps=true` required for Vercel
- No middleware.ts — deprecated in Next.js 16
- Vercel Blob files are **private** — need Bearer token to fetch by URL
- Existing tags: `v0-baseline-2026-04-10`, `v1.0-2026-04-10`
