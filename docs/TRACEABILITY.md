# PRD v2.1 Traceability Matrix

Maps every governing requirement of `docs/PRD.md` (v2.1, spec of record) to the
current build. Status is assessed against the code in `server/` and `public/`,
not against intentions.

**Legend** — ✅ Shipped · 🟡 Partial (gap noted) · ❌ Not built · ⛔ N/A (deliberately out of scope)

---

## §7.1 Authentication and user management

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| Email + password registration | ✅ | `server/auth.js` — scrypt (N=16384), per-user salt, strength rules |
| Mandatory email verification before registered content | ✅ | 6-digit code, salted hash at rest, 15-min TTL, 6 attempts |
| Password reset | ✅ | `/forgot`, same code machinery, audited |
| Session management and logout | ✅ | SHA-256-hashed tokens, httpOnly, 7-day expiry, revoke one/all |
| Magic-link login (optional) | ❌ | Optional per PRD — deferred |
| Two-factor authentication (optional, later release) | ❌ | Optional per PRD — deferred |
| Role: Investor / Prospect | ✅ | Default role |
| Role: Super Admin | ✅ | Console key + separate 12h session (`/admin`) |
| Role: Internal Project Lead | ❌ | Phase 2/3 (needs roles model) |
| Role: Reviewer / Delegate | ❌ | Phase 2/3 (needs roles model) |
| Invite codes / restricted registration | ❌ | Open registration; invitation mode is PRD Open Question #2 |
| Suspend / reactivate / remove access | 🟡 | Suspend + reactivate with session revocation shipped; hard delete not exposed |

## §7.2 Project showcase

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| Portfolio landing page | ✅ | `/` overview + `/projects` showcase |
| Project cards (title, sector, stage, geography, status, summary, visual) | ✅ | `server/content.js` brief fields feed cards |
| Filters: sector, stage, geography, ticket size | ✅ | `/projects` filter bar; text search partial |
| Brief sections: summary, problem/solution, market, model, traction, investment summary | ✅ | All present in `content.js` briefs |
| Brief sections: team, use of funds | 🟡 | Present for some projects, not enforced as required fields |
| Image gallery | ❌ | v2.1 addition — Phase 2 media work |
| Promotional / explainer video | ❌ | v2.1 addition — Phase 2 media work |
| FAQ block | 🟡 | Diligence Q&A thread exists post-approval (§8 item shipped early); pre-brief FAQ not modelled |
| Visibility: public teaser / registered-only / invitation-only / hidden draft | ❌ | All briefs are registered+verified visible; no per-project visibility flag yet |
| Status: draft/published/open/under review/paused/closed | 🟡 | Projects effectively published; no status lifecycle field yet |

## §7.3 Investor interest capture

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| One request per investor per project | ✅ | Enforced in `app.js` |
| Structured interest form (type, country, ticket, timeline, experience, contact, message, consent) | 🟡 | Qualification profile (type, ticket, accredited) captured at registration; interest submission is lighter than the PRD form — PRD form fields to be merged in |
| Statuses | 🟡 | Build: `nda_pending → nda_signed → approved / rejected / revoked` maps to PRD `NDA_SENT → NDA_SIGNED → DATA_ROOM_APPROVED / NOT_A_FIT / REVOKED`; missing `UNDER_REVIEW`, `IN_DISCUSSION`, `TERM_SHEET`, `CLOSED`, `EXPIRED` |
| Internal notes on requests | ✅ | Optional note on approve/reject, stored and shown in console |
| Owner / reviewer assignment | ❌ | Needs roles model |

## §7.4 NDA and legal gate

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| Platform-hosted acknowledgment flow | ✅ | `DV-CONF-2026.1` — 8 clauses, 5 acknowledgements, typed signature + initials |
| E-signature provider / manual PDF upload | ❌ | Alternative delivery modes — Phase 2 per PRD |
| Record: template version, signer, timestamp, hash | ✅ | Version, name, UTC time, IP, text hash stored; visible to investor and operator |
| Operator views signed NDA before approval | ✅ | Console queue shows the signature record |
| Project-specific approval | ✅ | Approve/reject per project per investor |
| Approval with expiry date | ❌ | No expiry field yet (PRD Open Question #10) |
| Immediate revocation | ✅ | Revoked investors lose room access instantly; sessions revocable |
| Revocation ≠ un-possessing downloaded files | ✅ | Documented; watermark carries attribution |

## §7.5 Confidential document management

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| Confidential content never at public URLs | ✅ | Content lives in `server/content.js`; serialised only to approved sessions |
| Watermark: name, email, request ID, timestamp, warning | ✅ | Reader overlay (name · email · receipt) + stamped printable HTML download with receipt, agreement version, redistribution warning |
| Operator upload (PDF/DOCX/XLSX/PPTX/PNG/JPG/MP4) | ❌ | Documents are authored in `content.js`; upload pipeline is Phase 2 (pdf-lib watermarking) |
| Document versioning (number, date, author, change note, active flag) | 🟡 | Sections are structured and bumpable, but no formal version ledger per document |
| Visibility classes (public / registered / NDA / data-room) | 🟡 | All documents are data-room-only; other classes not modelled |

## §7.6 Document and media access tracking

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| Authenticated viewer | ✅ | `/room/<slug>/<doc>` — approved sessions only |
| Watermarked download | ✅ | Authenticated, logged endpoint |
| Print | ✅ | Printable stamped rendering |
| Document-level permissions (view / +download / +print) | ❌ | All approved docs carry full permission; per-doc flags not modelled |
| Short-lived signed URLs (60–300s) | 🟡 | Authenticated endpoints achieve the same gate; signed-URL mechanics not implemented |
| Log: view / download / print / failed / revoked attempts | ✅ | Server-side event ingest (`server/analytics.js`); anonymous posting rejected |
| Log: video view / watch-progress | ❌ | No video yet |
| Screenshot/leak caveat acknowledged | ✅ | Watermark + NDA as deterrence/attribution — documented posture |

## §7.7 Audit and activity tracking

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| Append-only audit, protected from casual edit | ✅ | Append-only store, capped 8,000 rows (export first) |
| Core fields: actor, role, project, document, action, UTC time, outcome | ✅ | Present on audit rows |
| Fields: IP, user agent, session ID, media ID | 🟡 | IP captured (signatures, security events); UA / session-ID / per-row request-ID not uniformly on every event |
| Events: registration, verification, login, failed login, reset | ✅ | All logged |
| Events: interest submission, status change, NDA signed, approve/reject/revoke | ✅ | All logged |
| Events: document view/download/print, failed access | ✅ | All logged |
| Events: expiry, upload, version change, media, import/export | 🟡 | Import dry-run / commit / commit-rejected are audited (incl. in the console's `import.*` filter); expiry, upload and media events await those features |
| Admin filter by investor / project / document / date / action | 🟡 | Action (incl. `import.*`) + project filters live; investor and date-range filters to add |
| Audit export | ✅ | Console export |
| Audit-log export itself audited | ✅ | Logged as an action |

## §7.8 Super Admin dashboard

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| Pending requests / NDA verification / approvals queues | ✅ | Console queue with identity + qualification |
| Recently active prospects, interest per project, pipeline overview | ✅ | Funnel counts, per-investor record with full trail |
| Audit-log explorer | ✅ | With action/project filters |
| User management (suspend/reactivate) | ✅ | With session revocation |
| Project/document/media CRUD from the console | 🟡 | Content is code-managed (`content.js`); **project import from the console is live** (`server/importer.js`); console edit/delete of existing projects and the media pipeline remain |
| Preview-as-investor, SEO fields, drag-and-drop ordering | ❌ | Not built |
| Bulk import/export (CSV/XLSX, dry-run, row-level errors) | 🟡 | **Import shipped** (PRD v2.1 §7.8): CSV + zero-dependency XLSX reader, validate-only mode, row-level issues, downloadable error report, upsert by slug, import audit records. **Export** not yet built |
| Media & video management | ❌ | v2.1 addition |
| Site settings & branding | ❌ | Branding is code-level (design system) |
| Analytics: traffic/acquisition | ❌ | First-party event pipeline exists to build on |
| Analytics: project performance / investor funnel | 🟡 | Funnel counts + interest per project shipped; conversions, median times, stalled prospects to add |
| Analytics: operational & security | 🟡 | Failed logins and revocation attempts visible in audit; dashboards to add |
| Analytics separated from audit log | ✅ | Two distinct stores: `events` (analytics) vs `audit` (security) |
| Dashboard permissions matrix | 🟡 | Binary today (investor / console key); matrix arrives with roles |

## §7.9 Notifications

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| In-app: verification / reset codes | ✅ | Demo mode renders codes on screen + server log |
| Email delivery of any notification | ❌ | Top "not production-ready" item — wire SMTP/API provider |
| Notification catalogue (12 types) | ❌ | Pending the email channel |

## §8 Future features already shipped early

| Item | Status |
| --- | --- |
| Moderated Q&A thread per project | ✅ Diligence thread, attached to the access receipt |
| Basic investor CRM notes | 🟡 Operator notes on approve/reject only |

## §9 Non-functional requirements

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| Server-side authorization on every sensitive route | ✅ | All routes through the function; no client-side gating |
| Injection / CSRF / XSS / IDOR protection | ✅ | Same-origin Origin checks, strict CSP (`script-src 'self'`, no inline), no public object refs |
| Rate limiting (auth, registration, codes, admin) | 🟡 | In-memory per instance — shared limiter needed for multi-instance |
| Secrets in env management | ✅ | `ADMIN_KEY`, Redis URL via env; no fallback key on Vercel |
| TLS / at-rest encryption | 🟡 | TLS on the platform; at-rest encryption deferred to the Postgres/object-storage move |
| Privacy notice, consents, data minimisation | ✅ | `/legal` (terms · privacy · disclaimer), registration consents |
| Retention periods defined | ❌ | To be written before real investors |
| WCAG 2.1 AA | 🟡 | Semantic HTML, labelled forms; formal contrast/keyboard audit not run |
| Performance p95 targets | ✅ (informal) | Zero-dependency static-ish pages + one serverless function; not formally measured |
| Scalability beyond single JSON document | 🟡 | Redis-backed on Vercel; Postgres swap behind same interfaces is the designated path |

## §11.2 Technology stack — recorded deviation

The PRD recommends a Next.js + PostgreSQL + vendor stack. Per **ADR-001**
(`docs/DECISIONS.md`) the build keeps the zero-dependency Node engine. Every
other §11.2 concern (private storage, per-user watermarking, background jobs,
analytics separation) is satisfied architecturally; vendor selections are
deferred and must be recorded in `docs/DECISIONS.md` when made.

## §13 Launch criteria — current reading

| Criterion | Met? |
| --- | --- |
| Investor: register → verify → brief → interest | ✅ |
| Confidential content unreachable without active approved grant | ✅ |
| NDA status visible and verifiable before approval | ✅ |
| Downloads watermarked and logged | ✅ |
| Audit captures the events that exist | ✅ |
| Admin actions logged | ✅ |
| Privacy notice / retention published or approved | 🟡 notice shipped · retention policy outstanding |
| Super Admin project + document + media CRUD, imports/exports, analytics | 🟡 project import live · document/media CRUD, export and analytics outstanding |
| Security / a11y / mobile testing pass, backup & incident docs | 🟡 mobile-responsive + E2E pass run · formal a11y, backup, incident docs outstanding |

---

**Short version.** The investor-facing gate — the part that protects
confidential material — is complete and matches v2.1's intent. The gap is
almost entirely on the operator side: console-based content and media
management, export, the full 10-state pipeline, expiry, roles, email
notifications, and the analytics dashboards. Project import shipped ahead of
schedule (2026-10-28): CSV/XLSX with dry-run validation, upsert by slug, and
full audit coverage. The remaining roadmap: **analytics dashboards → full
10-state pipeline + expiry → document upload/versioning → export (CSV/XLSX) →
media layer → roles → email**.
