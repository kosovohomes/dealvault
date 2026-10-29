# DealVault

A gated, audited deal room for private projects — built on the CafePass Capital engine (zero-dependency Node.js, server-side gating, JSON/Redis store) wearing the CafePass investor-site design system (cream paper, deep green, Poppins).

The public surface lists non-confidential project briefs. Everything sensitive sits behind three gates: a verified account, a signed confidentiality agreement, and a per-project approval made by the operator in the console. Every significant action — registrations, signatures, approvals, document opens, downloads, prints — is written to an append-only audit trail.

```bash
npm start          # http://127.0.0.1:4173
npm run demo       # seed the demo store, then start
npm run dev        # start with --watch
npm run reset      # delete data/store.json after confirmation
npm run seed       # rebuild the demo store (--force)
```

Requires Node 20+ (built and tested on Node 24). No install step — there are no dependencies.

**Deploying to Vercel:** see [DEPLOY.md](DEPLOY.md). In short: import the folder, set `ADMIN_KEY`, connect Upstash Redis for persistence, deploy.

---

## Specification of record

**PRD v2.1 (28 Oct 2026)** is the governing specification: [`docs/PRD.md`](docs/PRD.md). PRD v2.0 is archived at [`docs/archive/PRD-v2.0.md`](docs/archive/PRD-v2.0.md).

- [`docs/TRACEABILITY.md`](docs/TRACEABILITY.md) — every §7–§13 requirement mapped to build status (shipped / partial / not built), with the remaining backlog in priority order
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — architecture decision records, including ADR-001: the PRD §11.2 vendor stack is deliberately **not** followed; the zero-dependency engine is retained, and ADR-008: v2.1 adoption

---

## What is here

| Surface | URL | Access |
| --- | --- | --- |
| Public overview | `/` | Public |
| Registration | `/register` | Public |
| Email verification | `/verify` | Account holders |
| Sign in / password reset | `/login`, `/forgot` | Public |
| Project showcase + filters | `/projects` | Registered + verified |
| Project brief | `/projects/<slug>` | Registered + verified |
| NDA signing | `/nda` | Registered + verified |
| Project data room | `/room/<slug>` | Approved request + NDA |
| Document reader | `/room/<slug>/<doc>` | Approved request + NDA |
| Personal access record | `/account` | Session |
| Terms / privacy / disclaimer | `/legal` | Public |
| Operator console | `/admin` | Console key |

### Demo credentials

The seed creates nine investors (seven approved, one pending, one revoked) with requests and reading history across three projects.

```
Password for every seeded investor:  DealVault#Demo2026

layla.haddad@levanthorizon.com   approved · CafePass + Sakan rooms, deep reading
omar@meridiangrowth.com          approved · CafePass room, mid reading
sara@cedarfo.com                 approved · CafePass + Nakhlah (signed, awaiting)
yousef@ammanangels.com           approved · Nakhlah request was rejected
nadia@gulfbridge.capital         approved · Sakan room
tariq@rum-equity.com             approved · CafePass, not started
elena@northstarcollective.eu     verified · NDA pending
hassan@dunesfamily.sa            verified · NDA to sign (tests the legal gate)
mariam@levantseed.com            revoked  · tests access withdrawal

Admin console:  /admin
Console key:    dealvault-admin-2026   (local default; set ADMIN_KEY in production)
```

New investors register at `/register`. In development `DEMO_MODE` is on: verification and reset codes are shown on screen and in the server log instead of being emailed.

---

## The flow

1. **Register** — name, firm, jurisdiction, investor profile, password (scrypt-hashed). Email verified with a six-digit code before anything beyond the gate opens.
2. **Browse** — the showcase lists non-confidential briefs with sector / stage / geography / raise-size filters. Briefs state plainly that they are not offers.
3. **Express interest** — one access request per investor per project. The request starts as `nda_pending`.
4. **Sign the agreement** — the platform-level NDA (`DV-CONF-2026.1`, eight clauses) is signed once: five acknowledgements, typed signature matching the account name, initials. Signing advances every pending request to `nda_signed`. The signature record (name, timestamp, IP, text hash) is stored and visible to the investor.
5. **Operator decision** — the console queue shows each request with the investor's identity and qualification. Approve or reject per project, with an optional note. Approving opens that project's room for that investor only.
6. **Read** — documents are served only to approved sessions, watermarked with the reader's name, email and receipt. Section navigation, reading progress, "mark reviewed" attestation, watermarked HTML download, print.
7. **Everything is audited** — both sides see the same record: the account page shows the investor's own trail; the console shows everyone's.

Request state machine: `nda_pending → nda_signed → approved / rejected / revoked`.

---

## Importing projects (operator walkthrough)

Bulk-add or update project briefs from a spreadsheet — console → **Import** tab. CSV and XLSX both work, and every run is validated before anything is written.

1. **Open the console** — `/admin`, paste the console key, "Open the console".
2. **Get the template** — Import tab → **"Download the template"**: a 16-column CSV with two example rows. Keep the header row exactly as it is.
3. **Fill one row per project.** Required cells: Title, Summary, Sector, Stage, Geography, Ticket. The rest is optional — Slug is generated from the title when left blank, and multi-value cells (Tags, Highlights, Story paragraphs) are separated with `;` or `|`.
4. **Dry run** — choose the file, leave the mode at **"Validate only (dry run)"**, click **Run import**. You get a row-level report of errors and warnings plus counts of what *would* be created or updated — nothing is saved. (Dry-running the untouched template should report `2 rows · 0 errors · 2 would be created`.)
5. **Fix problems off-line** — if validation fails, **"Download error report"** gives a CSV naming the exact row and cell for every issue; fix those cells and re-run step 4.
6. **Commit** — switch the mode to **"Validate and commit"** and run again. New slugs create projects, existing slugs update them in place (built-in slugs cannot be shadowed). Both the dry run and the commit are written to the audit log.
7. **Verify** — the Projects tab shows the results. Rows imported as `draft` or `paused` are invisible to investors until you set them to `open`.

Rules worth knowing: 2 MB / 200 rows per file, 500 projects in total. Status accepts `open · published · under-review · draft · paused · closed` (aliases like "live" and "hold" are mapped); blank status imports as `open`. Visibility is `public · registered · invitation · hidden`, defaulting to `registered` — and a `hidden` row with `open` status is parked as `draft` until made visible. XLSX files are parsed server-side by a hand-rolled reader — see [ADR-010](docs/DECISIONS.md).

---

## What is measured

First-party events, written server-side; anonymous visitors cannot post document events.

| Signal | Capture |
| --- | --- |
| Active reading time | 5s sampler, 15s heartbeat while visible and recently interacted; idle/background excluded |
| Section depth | IntersectionObserver dwell per section, counted at ≥ 2.5s |
| Scroll depth | Milestones at 50%+ in 25% steps |
| Document open / close | `doc_open` on load, `doc_close` with active time |
| Review | Explicit "Mark reviewed" attestation |
| Downloads / prints | Server-side — each hits an authenticated, logged endpoint |
| Questions | Diligence thread per project, attached to the access receipt |
| Account lifecycle | Registration, verification, sign-in (ok + failed), resets, sessions revoked |

Console: funnel counts, interest per project, per-investor record with full audit trail, audit explorer with action/project filters, suspend / re-activate with session revocation, and CSV/XLSX project import with dry-run validation.

---

## Security model

- **Server-side gating** — document content lives in `server/content.js` and is only serialised in response to an approved session. There is no client-side hiding, and Vercel routes every request through the function so the gate cannot be bypassed.
- **Passwords** — scrypt (N=16384) with per-user salt, timing-safe comparison, strength rules.
- **Sessions** — random 32-byte tokens stored only as SHA-256 hashes, `httpOnly`, `SameSite=Lax`, `Secure` over TLS, seven-day expiry, revocable individually or everywhere.
- **Verification / reset codes** — six digits, salted hash at rest, 15-minute TTL, six attempts, resend cooldown, per-IP and per-email rate limits.
- **Admin** — separate key, separate cookie, twelve-hour session, timing-safe comparison, login rate limit; every console action audited. No fallback key on Vercel.
- **CSRF** — state-changing requests require a same-origin `Origin`.
- **Headers** — strict CSP (`script-src 'self'`, no inline scripts), `X-Frame-Options: DENY`, nosniff, referrer and permissions policy.
- **Watermarks** — reader overlay (name · email · receipt) and a stamped, printable HTML download carrying the receipt, agreement version and a redistribution warning.
- **Audit** — append-only, capped at 8,000 rows in the store; export before that matters.

### What is deliberately not production-ready

1. **Deliver codes by email.** Demo mode shows codes on screen. Wire an SMTP/API provider, keep codes out of the page, add bounce handling.
2. **Move off the JSON store.** `server/store.js` is single-document and readable by design. Swap in Postgres behind the same interfaces when the investor count grows.
3. **Rate limiting is in-memory** per instance — add a shared limiter or WAF for multi-instance deployments.
4. **PDF ingestion** — documents are authored in `server/content.js` (versioned HTML sections). Uploaded-PDF support with pdf-lib watermarking is the natural Phase 2.
5. **Legal review** — the agreement, privacy notice and every figure need counsel before real deals. All numbers are illustrative planning cases, not offers of securities.

---

## Project layout

```
dealvault/
├─ server/
│  ├─ index.js        local launcher
│  ├─ app.js          router, page gating, APIs, watermarked downloads
│  ├─ content.js      3 projects · 8 confidential documents · public briefs (+ imported merge)
│  ├─ importer.js     CSV/XLSX project import: dry-run validation, upsert, audit
│  ├─ legal.js        NDA text, clauses, consents, hash
│  ├─ analytics.js    event ingest, reading progress, aggregates
│  ├─ auth.js         passwords, sessions, codes, admin auth
│  ├─ store.js        JSON store (Upstash Redis on Vercel), atomic flush, audit
│  └─ config.js       environment and constants
├─ api/index.js       Vercel serverless entry (all routes through it)
├─ public/            13 pages · css (ported design system + vault.css) · js
├─ scripts/           seed.js (9 demo investors) · reset.js
└─ data/store.json    demo store (committed; replace with empty to start clean)
```

## Editing content

- **Projects and documents** — `server/content.js`. Public brief fields feed the showcase; document sections are confidential and never serialised without approval. Changing text does not affect signatures.
- **Importing projects (console)** — the console's **Import** tab accepts CSV or XLSX briefs with dry-run validation: validate-only never mutates anything, row-level errors come with a downloadable report, and committing creates new projects or updates existing ones by slug (built-in slugs cannot be shadowed). `draft`/`paused` statuses hide a project from investors while it stays visible in the console. Download the template from the tab for the exact columns; see `docs/DECISIONS.md` ADR-010.
- **Agreement** — `server/legal.js`. Changing the text changes the hash; bump `NDA_VERSION` when the substance changes so existing signatures stay bound to what they signed.
- **Design** — `public/assets/css/site.css` + `doc-skin.css` are the forked CafePass design system; `vault.css` holds the platform components (cards, badges, filters, tables). Keep the token system.

## Starting with an empty database

Replace the contents of `data/store.json` with `{ "users": [], "projects": [], "requests": [], "events": [], "questions": [], "audit": [] }` (keeping `version` and `meta`), commit, and deploy. On Redis, delete the KV key instead.
