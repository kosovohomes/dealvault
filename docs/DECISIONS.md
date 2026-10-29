# Architecture Decision Records

Short-form ADRs. Status: **accepted** unless noted. Decisions are never
silently reversed — a new ADR supersedes an old one by reference.

---

## ADR-001 — Zero-dependency Node engine (not the PRD §11.2 stack)

**Context.** PRD §11.2 recommends Next.js + PostgreSQL + Clerk/Auth.js + S3/R2
+ background jobs. An earlier generation of this product (CafePass Capital)
already ran a hardened, zero-dependency Node.js engine with server-side
gating, scrypt auth, sessions, OTP codes, an append-only audit trail, and a
JSON/Redis dual store — proven end-to-end and deployable as a single Vercel
function through which every request passes.

**Decision.** Keep the zero-dependency engine. The PRD's §11.2 stack is
treated as a reference architecture, not a requirement. Deviation is
deliberate and recorded.

**Consequences.** No supply-chain surface (zero npm dependencies), one
deployable function, gate cannot be bypassed by routing. Cost: console-based
content CRUD, upload pipelines, and background jobs must be built by hand, and
the JSON store must be swapped for Postgres behind existing interfaces before
serious scale (see ADR-006).

## ADR-002 — Phase-1 scope

Ship the investor-facing gate first: registration → verification → showcase →
interest → NDA → per-project approval → watermarked reading → audit. Operator
conveniences (console CRUD, imports, analytics dashboards, media) follow.

## ADR-003 — Product name and identity

Name: **DealVault**. Visual identity: self-drawn vault-dial SVG mark; the
CafePass investor-site design system (cream paper, deep green, Poppins) is
ported as the base design language, extended with `vault.css` platform
components.

## ADR-004 — Authentication posture

Email + password (scrypt) with mandatory 6-digit email verification. OTP codes
are salted-hashed at rest, 15-minute TTL, attempt-limited, rate-limited.
Magic links and 2FA remain PRD-optional and deferred. Demo mode shows codes
on screen for development only and must be off in production.

## ADR-005 — Platform-level NDA before project approvals

One platform-level confidentiality agreement (`DV-CONF-2026.1`, eight
clauses) is signed once per investor via a hosted acknowledgment flow (five
acknowledgements, typed signature matching the account, initials); signing
advances all pending requests. Project-specific approval remains a separate,
per-project operator decision. PRD §7.4's alternative delivery modes
(e-signature provider, manual PDF upload) are Phase 2 options; project-specific
NDA templates are a Phase 3 option. Changing agreement substance requires a
version bump so signatures stay bound to what was signed.

## ADR-006 — Storage: JSON locally, Upstash Redis on Vercel, Postgres later

`server/store.js` speaks a small interface over a single document. Local runs
use `data/store.json`; Vercel uses Upstash Redis. When investor count or audit
volume demands it, swap in Postgres behind the same interface. The audit log
is append-only and capped at 8,000 rows in either backend — export before
that matters.

## ADR-007 — Analytics and audit are separate stores

Product analytics (reading time, scroll depth, section dwell, doc open/close)
live in `events`; security/audit records live in `audit`. They are never
mixed: analytics may be aggregated or dropped; audit is append-only. This
implements PRD v2.1 §7.8's separation requirement.

## ADR-008 — PRD v2.1 adopted as spec of record

**28 Oct 2026.** `docs/PRD.md` (v2.1) is the governing specification; v2.0 is
archived at `docs/archive/PRD-v2.0.md`. Requirement-to-build coverage is
tracked in `docs/TRACEABILITY.md`. The v2.0 → v2.1 delta (media/video layer,
portfolio analytics, import/export, expanded Super Admin dashboard) becomes
the build backlog in the order given at the foot of the traceability matrix:
imports/exports → analytics dashboards → full 10-state pipeline + expiry →
document upload/versioning → media layer → roles → email notifications.

## ADR-009 — Preview bridge for sandbox demonstration

The sandbox exposes port 3000 (Next.js dev). DealVault itself has no Next.js
dependency: it runs on its own port (3010 locally), and a single catch-all
route (`src/app/[[...dv]]/route.ts` in the surrounding sandbox project)
proxies every request, cookie and redirect to it, rewriting `Origin`/`Referer`
so CSRF checks still pass. This bridge is sandbox tooling only — it is not
part of the deployable `dealvault/` folder, which goes to Vercel as-is.

## ADR-010 — Project import: CSV + hand-rolled XLSX, validate-first, upsert by slug

**28 Oct 2026.** PRD v2.1 §7.8 requires CSV/XLSX project import with dry-run
validation. Decisions:

- **Two-step discipline.** The importer is pure: `buildImport()` parses and
  validates without touching the store; `applyImport()` commits a validated
  plan. Dry-run therefore cannot mutate anything by construction. Commits are
  re-validated server-side; a file with any blocking error is rejected whole.
- **Zero-dependency file readers.** CSV is an RFC 4180 state machine with
  delimiter sniffing (`,` `;` tab). XLSX is read by parsing the ZIP central
  directory by hand and inflating DEFLATE streams with `node:zlib`, then
  extracting shared strings and the first worksheet with a tolerant scanner —
  enough for flat metadata sheets, nothing more.
- **Upsert by slug.** A row whose slug already exists in the store updates
  that project; unknown slugs create. Built-in (`content.js`) slugs cannot be
  shadowed, and duplicates within one file are rejected. Draft/paused
  statuses hide a project from investors while remaining console-visible.
- **Bounds.** 2 MB file cap, 200-row cap, 500 imported-project cap, 12
  imports/hour per IP; every dry-run, commit and rejection is audited
  (`import.dry_run`, `import.commit`, `import.commit_rejected`).
- **Scope.** Import carries brief metadata only — no confidential documents —
  until the upload pipeline (ADR backlog, PRD §7.5) lands. Export remains
  unbuilt.
