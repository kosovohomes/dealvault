<!-- ADOPTION RECORD
     Status:        SPEC OF RECORD (adopted 28 Oct 2026)
     Supersedes:    PRD v2.0 (archived at docs/archive/PRD-v2.0.md)
     Coverage:      docs/TRACEABILITY.md maps every §7–§13 requirement to build status
     Deviations:    docs/DECISIONS.md — §11.2 vendor stack intentionally NOT followed
                    (zero-dependency Node engine retained per ADR-001)
-->
# Product Requirements Document (PRD)

## DealVault — Private Investment Showcase & Deal Room

**Version:** 2.1  
**Date:** 28 October 2026  
**Owner:** [Your Name / Company]  
**Status:** Draft for review  
**Product type:** Private, single-operator investment showcase, investor-interest capture, controlled deal room, and portfolio-analytics platform

---

## 1. Product Vision

DealVault is a private, branded web platform operated by **[Your Company]** to present selected projects from its own portfolio, attract and qualify prospective investors, and provide controlled access to confidential diligence materials.

The platform has two complementary purposes:

1. **Promotion:** Present projects professionally through polished, non-confidential project pages, media, videos, and shareable links.
2. **Controlled disclosure:** Release sensitive documents only after investor identity verification, NDA execution, and explicit operator approval.

DealVault is not an open marketplace. All projects belong to the operator. Investors are invited prospects or registered contacts, not independent platform participants.

---

## 2. Problem Statement

Project owners and investment promoters commonly share investor materials through email, WhatsApp, cloud links, and ad-hoc PDFs. This creates several problems:

- No single, professional source of truth for project information.
- Difficulty controlling who receives confidential materials.
- Limited visibility into which investors are genuinely interested.
- No reliable record of who viewed or downloaded sensitive documents.
- Manual follow-up and inconsistent investor communication.
- Risk of outdated documents being circulated after revisions.
- No consolidated view of which projects, channels, and materials generate investor interest.

DealVault solves this by combining a public or invite-only promotional layer with a secure, NDA-gated data room, media management, investor-engagement tracking, and portfolio analytics.

---

## 3. Goals

### Business goals

- Present the operator’s project portfolio in a professional, credible, and consistent format.
- Convert visitor attention into verified investor interest.
- Qualify prospects before exposing confidential materials.
- Track engagement by prospect, project, document, video, and funnel stage.
- Reduce manual distribution of investor packs and confidential files.
- Maintain a clear pipeline from first interest to investment discussion.
- Understand which projects, channels, and content perform best.

### Product goals

- Provide a clean, mobile-responsive showcase for selected projects.
- Allow public or invitation-based access to non-confidential project briefs.
- Capture structured investor interest and qualification data.
- Gate confidential documents and private media behind NDA execution and operator approval.
- Watermark and audit access to confidential materials.
- Enable the operator to revoke or expire access at any time.
- Give the Super Admin full control over content, media, imports, exports, users, and analytics.

---

## 4. Success Metrics

| Funnel stage | Metric | v1 approach |
|---|---|---|
| Awareness | Unique visitors per project page or shared link | Establish baseline after launch |
| Capture | Visitor-to-verified-registration conversion rate | Establish baseline |
| Interest | Registered user-to-Express Interest conversion rate | Target 20–40% for warm or invited traffic |
| Qualification | Percentage of interest requests marked Qualified | Track; no arbitrary initial target |
| Legal progression | Interest-to-signed-NDA conversion rate | Target 50%+ among qualified prospects |
| Disclosure | NDA-signed-to-data-room-approved conversion rate | Target 70%+ |
| Engagement | Approved prospects opening at least one confidential document | Target 80%+ |
| Media engagement | Video views, watch duration, and completion rate | Establish baseline |
| Commercial progression | Approved prospects entering In Discussion | Track weekly |
| Outcome | Meetings booked, introductions made, term discussions started | Primary commercial success measure |
| Operational | Median time from Express Interest to NDA signed | Establish baseline |
| Operational | Median time from NDA signed to access approval | Target under 1 business day |
| Security | Percentage of defined sensitive events successfully recorded in audit log | 100% |

Downloads should not be treated as an unqualified success metric. A prospect who reviews a summary, asks questions, and requests a meeting may be more valuable than one who downloads every document.

---

## 5. Target Users

| Persona | Description | Primary needs |
|---|---|---|
| Prospective Investor | Individual, family office, institutional investor, strategic partner, or adviser evaluating an opportunity | Clear project overview, credible presentation, simple NDA process, controlled access to diligence materials |
| Operator / Super Admin | The platform owner or authorized representative | Full control over projects, media, prospects, approvals, imports, exports, analytics, audit trail, and follow-up |
| Internal Project Lead | Internal user responsible for a specific project | Ability to update assigned project content, upload documents and media, and view relevant engagement |
| Reviewer / Delegate | Optional staff member with limited permissions | Review requests, manage documents, view activity and selected analytics without full super-admin control |

---

## 6. Core User Journeys

### 6.1 Investor discovery and registration

1. Investor receives a project link, invitation code, QR code, or visits the platform.
2. Investor views a public or semi-public project teaser, including approved images or video.
3. Investor registers with email and password, or uses an invited access link.
4. Investor verifies email.
5. Investor gains access to permitted non-confidential project briefs and media.

### 6.2 Investor interest and qualification

1. Investor browses available projects.
2. Investor opens a project brief.
3. Investor selects **Express Interest**.
4. Investor completes a structured interest form.
5. The request appears in the operator’s qualification queue.
6. Operator reviews the prospect and marks the request as qualified, needs follow-up, or not a fit.

### 6.3 NDA and data-room access

1. Qualified investor receives an NDA or data-room rules document.
2. Investor signs electronically or uploads a manually executed NDA, depending on configuration.
3. Operator verifies the NDA and approves project-specific access.
4. Investor gains access to approved confidential documents and private media for that project only.
5. Investor views or downloads watermarked documents and accesses permitted video content.
6. All access activity is recorded.

### 6.4 Follow-up and pipeline management

1. Operator reviews investor activity and engagement.
2. Operator updates pipeline status.
3. Operator schedules a call, sends follow-up, shares an updated document, or closes the opportunity.
4. Operator can revoke or expire access at any time.

---

## 7. Functional Requirements

### 7.1 Authentication and user management

- Email and password registration.
- Mandatory email verification before access to registered content.
- Password reset.
- Session management and logout.
- Optional magic-link login.
- Optional two-factor authentication in a later release.
- Roles:
  - Investor / Prospect
  - Internal Project Lead
  - Reviewer / Delegate
  - Super Admin
- Invite codes or direct project links may restrict registration to selected prospects.
- Admin can suspend, reactivate, or remove user access.

### 7.2 Project showcase

- Portfolio landing page listing active projects.
- Project cards showing title, sector, stage, geography, status, short summary, and key visual.
- Filters and search by sector, stage, geography, ticket size, and status.
- Project detail page containing:
  - Project title and tagline
  - Non-confidential executive summary
  - Problem and solution
  - Market opportunity
  - Business model
  - Current status or traction
  - Team or sponsor information, where appropriate
  - Investment opportunity summary
  - Use of funds, where appropriate
  - Image gallery
  - Promotional or explainer video
  - Frequently asked questions
  - Call to action: **Express Interest**
- Project visibility options:
  - Public teaser
  - Registered-users-only
  - Invitation-only
  - Hidden / internal draft
- Project status options:
  - Draft
  - Published
  - Open for Discussion
  - Under Review
  - Paused
  - Closed

### 7.3 Investor interest capture

- One interest request per investor per project.
- Interest form captures:
  - Investor type: individual, family office, institutional, corporate, adviser, other
  - Country or region
  - Intended investment range or ticket size
  - Investment timeline
  - Relevant experience or portfolio focus
  - Preferred contact method
  - Optional free-text message
  - Consent to be contacted and acknowledgment of privacy notice
- Interest request statuses:
  - `NEW`
  - `UNDER_REVIEW`
  - `QUALIFIED`
  - `NDA_SENT`
  - `NDA_SIGNED`
  - `DATA_ROOM_APPROVED`
  - `IN_DISCUSSION`
  - `TERM_SHEET`
  - `CLOSED`
  - `NOT_A_FIT`
- Operator can add internal notes to a prospect or request.
- Operator can assign an owner or reviewer to a request.

### 7.4 NDA and legal gate

- Support for project-specific NDAs and data-room rules.
- NDA delivery through one of the following:
  - Electronic signature provider
  - Manual PDF upload after offline signature
  - Platform-hosted acknowledgment flow, where legally appropriate
- Record:
  - NDA template version
  - Signer name and email
  - Signature date and time
  - Signature provider reference, if applicable
  - Signed-document storage location
- Operator must be able to view the signed NDA before approving data-room access.
- Approval is project-specific.
- Approval can include an expiry date.
- Operator can revoke access immediately.
- Revocation prevents new document and media access but does not remove already downloaded watermarked files from the investor’s possession.

### 7.5 Confidential document management

- Operator or authorized internal project lead can upload documents.
- Supported primary format: PDF.
- Documents can be marked:
  - Public
  - Registered-users-only
  - NDA-required
  - Approved-data-room-only
- Document versioning:
  - Version number
  - Upload date
  - Uploaded by
  - Change note
  - Active/archived status
- Only the active version should be available to investors unless historical versions are explicitly approved.
- Original confidential files must not be exposed through public URLs.
- Approved investors access only watermarked derivatives.
- Watermark must include, at minimum:
  - Investor name
  - Investor email
  - Access request ID
  - Download or view timestamp
  - Confidentiality warning
- Watermark example:  
  `CONFIDENTIAL — [Investor Name] — [Email] — Request ID: [ID] — Accessed: [UTC timestamp] — Do Not Distribute`

### 7.6 Document and media access tracking

- Access is granted per investor per project.
- Approved investor can:
  - View documents in an authenticated viewer
  - Download watermarked PDFs, where permitted
  - Print, where permitted
  - View permitted video content
- Document-level permissions may be configured as:
  - View only
  - View and download
  - View, download, and print
- Short-lived signed URLs or authenticated streaming must be used for documents and private media.
- Signed URL duration should be configurable, with a default of 60–300 seconds.
- The system must log:
  - Document view
  - Download
  - Print attempt
  - Video view
  - Video watch-progress event, where technically available
  - Share-link click, if applicable
  - Failed access attempt
  - Revoked-access attempt
- The platform cannot reliably prevent screenshots, photography, screen recording, or onward distribution after a document or video has been viewed or downloaded. Watermarking and NDA terms provide deterrence and attribution, not absolute leakage prevention.

### 7.7 Audit and activity tracking

Every significant action must be logged with:

- Actor user ID and role
- Actor type: investor, internal user, admin, system, or AI agent
- Project ID
- Document ID and document version
- Media ID
- Access request ID
- Action type
- UTC timestamp
- IP address or pseudonymized IP identifier
- Approximate geography, where available
- User agent and device information
- Session ID or request ID
- Outcome: success, denied, failed, revoked

Minimum logged events:

- Registration
- Email verification
- Login
- Failed login
- Password reset
- Project page view
- Express Interest submission
- Interest status change
- NDA sent
- NDA signed
- NDA verification
- Access approved
- Access rejected
- Access revoked
- Access expired
- Document view
- Document download
- Print attempt
- Video view
- Failed document or media access
- Document upload
- Document version change
- Media upload
- Media visibility change
- Admin role or permission change
- Import performed
- Export performed
- Audit-log export

Admin can filter and export audit activity by:

- Investor
- Project
- Document
- Media item
- Date range
- Action type
- Access status

### 7.8 Super Admin dashboard

The Super Admin dashboard is the operator’s central control panel. It must provide full control over projects, media, prospects, access, imports, exports, analytics, users, and platform settings.

#### Project management

- Create, edit, duplicate, archive, restore, publish, unpublish, and delete projects.
- Manage project metadata: title, slug, tagline, summary, sector, stage, geography, ticket size, status, visibility, featured flag, and call to action.
- Reorder projects on the portfolio page using drag-and-drop or manual sort order.
- Set project visibility: public teaser, registered users only, invitation only, or hidden draft.
- Preview a project exactly as an investor would see it before publishing.
- Manage project-specific SEO fields: page title, meta description, social-share image, and canonical URL.
- View project-level engagement: visits, unique visitors, registrations, interest requests, NDA status, approved access, document views, downloads, and video engagement.

#### Bulk import and export

- Import projects from CSV or XLSX.
- Import project metadata, including title, summary, sector, stage, geography, status, visibility, tags, and external links.
- Support a dry-run validation mode before committing an import.
- Show import errors row by row, with the ability to download an error report.
- Export projects to CSV or XLSX.
- Export project content, document metadata, media metadata, access-request data, investor-interest data, and engagement summaries.
- Export audit logs with filters by date, user, project, document, media item, and action type.
- Export must respect role-based permissions; confidential document contents must not be included in routine metadata exports.
- Maintain an import/export audit record showing who performed the action, when, what was imported or exported, and the outcome.

#### Document management

- Upload, replace, archive, restore, and delete documents.
- Upload PDF, DOCX, XLSX, PPTX, PNG, JPG, and MP4 files, with PDF as the preferred format for confidential diligence documents.
- Assign document visibility: public, registered users only, NDA-required, or approved data-room only.
- Assign document permissions: view only, view and download, or view, download, and print.
- Manage document versions, version notes, active version, and historical versions.
- Preview documents and media before publishing.
- Set file-size limits, allowed file types, virus/malware scanning where available, and storage quotas.
- Generate watermarked PDF derivatives for confidential documents.
- Prevent direct public access to original confidential files.
- Revoke access to a document or an entire project instantly.

#### Media and video management

- Upload and manage images, galleries, logos, project covers, and social-share images.
- Upload and manage MP4 or other supported video files.
- Support embedded video through approved providers, such as YouTube, Vimeo, or a private video host, where direct hosting is not appropriate.
- Configure video visibility: public, registered users only, NDA-required, or approved data-room only.
- Generate thumbnail images automatically where possible.
- Track video views, watch duration where available, completion rate, and access event.
- Use signed URLs or authenticated streaming for private video content.
- Do not expose private media through permanent public URLs.
- Support captions or transcripts for accessibility and optional multilingual content.

#### Site settings and branding

- Manage site name, logo, favicon, primary colors, typography options, footer content, and contact details.
- Manage global privacy notice, terms, cookie notice, and data-retention messaging.
- Manage email sender identity, notification templates, and notification preferences.
- Manage invite codes, invitation links, and registration restrictions.
- Manage default access-expiry periods and NDA requirements.
- Manage maintenance mode or limited-access mode.
- Manage admin users, roles, permissions, and delegation.

#### Site statistics and analytics

The Super Admin dashboard must include both product analytics and security/audit analytics.

Traffic and acquisition:

- Total visits, unique visitors, returning visitors, and new visitors.
- Traffic source: direct, referral, email, QR code, social, paid campaign, or invitation link.
- Campaign, UTM, invitation-code, and QR-code performance.
- Device, browser, operating-system, language, and approximate geography.
- Top landing pages and exit pages.
- Bounce rate and average session duration.

Project performance:

- Views per project.
- Unique viewers per project.
- Registration conversion rate per project.
- Express Interest conversion rate per project.
- NDA signed conversion rate per project.
- Data-room approval conversion rate per project.
- Document views and downloads per project.
- Video views and engagement per project.
- Most-viewed documents and most-active prospects.

Investor funnel:

- Funnel visualization from visitor to registered user to interested prospect to qualified prospect to NDA signed to data-room approved to commercial discussion.
- Conversion rate and median time between each funnel stage.
- Prospects by investor type, geography, ticket size, and timeline.
- Stalled prospects and follow-up reminders.
- Pipeline value or intended ticket-size totals, where provided by prospects.

Operational and security analytics:

- Pending requests, pending NDAs, pending approvals, and expiring access.
- Admin response times.
- Failed login attempts and suspicious access patterns.
- Revoked-access attempts.
- Download spikes or unusual activity.
- Audit-log completeness for defined sensitive events.
- Storage usage and document inventory.

Analytics must be separated from the immutable security audit log. Product analytics may use aggregated or pseudonymized data where appropriate, while security audit records must retain the level of detail required for investigation and compliance.

#### Dashboard permissions

- Super Admin: full access to projects, documents, media, users, imports, exports, analytics, audit logs, and platform settings.
- Reviewer / Delegate: configurable access to request review, document management, and selected analytics; no default access to user deletion, audit export, or platform-wide settings.
- Internal Project Lead: access limited to assigned projects, documents, media, and project-level engagement data.
- All content changes, imports, exports, permission changes, and analytics exports must be recorded in the audit log.

### 7.9 Notifications

Email and in-app notifications should include:

- Welcome and email verification
- Interest received
- Interest qualified or rejected
- NDA ready to sign
- NDA signed
- Data-room access approved
- Access rejected
- Access revoked
- Access expiring soon
- New document uploaded
- Document version updated
- New video or media published
- Follow-up reminder for unanswered interest requests

Notification frequency and unsubscribe preferences must be configurable for non-essential communications.

---

## 8. High-Value Future Features

### Near-term enhancements

- Investor watchlist or saved projects
- Side-by-side project comparison
- Document changelog visible to approved users
- Bulk watermarked PDF download as a tracked ZIP file
- Time-boxed access periods, such as 30, 60, or 90 days
- Basic investor CRM notes and reminders
- Custom-branded shareable project links
- QR codes for presentations and meetings

### Medium-term enhancements

- Moderated question-and-answer thread per project
- Investor profile with stated investment preferences
- Project-owner dashboard with aggregate engagement
- Advanced search and saved filters
- Arabic and English interface support
- Progressive Web App experience
- Meeting-scheduling integration
- Document e-signature for term sheets or letters of intent

### Optional AI-assisted features

All AI features must be opt-in, permissioned, logged, and subject to human review.

- **Brief Assistant:** Helps the operator draft or refine non-confidential project summaries.
- **Investor FAQ Assistant:** Answers common questions using only approved public project content.
- **Request Triage Assistant:** Suggests qualification priorities based on completeness, investor type, and engagement; never approves access autonomously.
- **Anomaly Detection:** Flags unusual activity such as mass downloads, unusual locations, rapid access attempts, or credential-sharing signals.
- **Document Intelligence:** Extracts structured highlights from approved documents for internal operator use.
- **Personalized Digest:** Sends selected new or updated projects to relevant prospects.
- **Compliance Assistant:** Checks whether required legal documents are present before approval.

AI agents must never independently grant, revoke, or approve access.

---

## 9. Non-Functional Requirements

### Security

- Encryption in transit using TLS.
- Encryption at rest for database and object storage.
- Server-side authorization for every sensitive route, API endpoint, Server Action, and file operation.
- No reliance on client-side permission checks.
- Short-lived signed URLs for document and private-media delivery.
- Rate limiting on authentication, registration, interest submission, download, media access, and admin endpoints.
- Input validation on all user-supplied data.
- Protection against common web vulnerabilities, including injection, CSRF, XSS, broken access control, and insecure direct object references.
- Secrets stored in secure environment-variable management.
- Dependency vulnerability scanning.
- Separate permissions for Super Admin, Reviewer, and Internal Project Lead.
- Admin actions must be audited.
- Audit logs must be append-only and protected from casual modification or deletion.

### Privacy and data protection

- Clear privacy notice at registration.
- Explicit consent for marketing communications where required.
- Data minimization: collect only information needed for qualification, communication, security, and legal compliance.
- IP addresses and geolocation data must be treated as personal data.
- Define retention periods for:
  - User accounts
  - Investor interest records
  - NDA records
  - Audit logs
  - Documents
  - Media and video files
  - Watermarked derivatives
- Provide data-access, correction, export, and deletion workflows where applicable.
- Restrict access to raw audit and personal data to authorized administrators.
- Use processor agreements with hosting, email, storage, video, signature, and AI providers.
- Conduct a privacy review before launch, especially if EU, UK, or other privacy-regulated investors are targeted.

### Performance

- Project list initial load: p95 under 1.5 seconds on a standard 4G connection.
- Project detail initial load: p95 under 2 seconds.
- Confidential document stream start: p95 under 2 seconds after authorization.
- Video start time: p95 under 3 seconds for standard-quality streaming.
- Admin dashboard load: p95 under 2.5 seconds.
- Audit-log filtering for 10,000 records: p95 under 3 seconds.

### Availability

- Target monthly uptime: 99.5% or higher.
- Define whether third-party outages from email, e-signature, storage, video hosting, identity, or hosting providers are included.
- Maintain a documented incident-response and recovery process.

### Accessibility

- Target WCAG 2.1 AA.
- Keyboard-navigable core flows.
- Sufficient color contrast.
- Descriptive alt text for meaningful images.
- Captions or transcripts for video content.
- Clear form labels and error messages.

### Scalability

- Initial target: hundreds of registered prospects and low thousands of concurrent sessions.
- Architecture should support growth to tens of thousands of registered users without a fundamental redesign.
- Document, image, and video storage should scale independently from application compute.

---

## 10. Out of Scope for v1

- Multi-tenant marketplace for third-party project owners.
- Public project submission by external founders.
- Payment processing, capital calls, or investment execution.
- Automated investment matching.
- Full CRM replacement.
- Native mobile applications.
- Real-time collaborative document editing.
- Guaranteed prevention of screenshots, screen recording, or onward distribution.
- Automated legal advice or automated investment recommendations.

---

## 11. Technical Overview

### 11.1 High-level architecture

```text
[Next.js App Router]
 ├── Public project teaser pages
 ├── Authenticated investor app
 ├── Super Admin / operator app
 ├── API routes and Server Actions
 └── Middleware for authentication and baseline routing

[Auth Provider]
        |
        v
[PostgreSQL database]
        |
        +-- [Object storage: S3 or Cloudflare R2]
        +-- [Image / video processing and streaming]
        +-- [Watermarking / PDF processing service]
        +-- [E-signature provider]
        +-- [Email service]
        +-- [Analytics service]
        +-- [Background jobs / queues]
        +-- [Optional AI services]
```

### 11.2 Recommended technology choices

| Layer | Recommended option | Notes |
|---|---|---|
| Frontend and backend | Next.js App Router, TypeScript, React Server Components, Server Actions | Suitable for a fast, secure full-stack web application |
| UI | Tailwind CSS, shadcn/ui, Lucide icons | Clean, customizable interface |
| Authentication | Clerk or Auth.js | Choose based on desired control, cost, and compliance requirements |
| Database | PostgreSQL | Use Neon, Supabase, or managed PostgreSQL |
| ORM | Prisma or Drizzle | Prisma is suitable for rapid development; Drizzle offers more SQL-level control |
| File storage | Cloudflare R2 or AWS S3 | Private buckets only; no public confidential-file URLs |
| Media processing | Cloudflare Stream, Mux, or self-managed transcoding | Use for MP4 upload, thumbnails, adaptive streaming, and private playback |
| PDF watermarking | pdf-lib or server-side rendering pipeline | Must support per-user dynamic watermarking |
| E-signature | DocuSign, Dropbox Sign, or PandaDoc | Select based on jurisdiction, cost, and API/webhook reliability |
| Email | Resend or Postmark | Transactional email and notifications |
| Analytics | PostHog, Plausible, or custom event tracking | Must not replace the security audit log |
| Background jobs | Inngest, Trigger.dev, or managed queue | NDA webhooks, watermarking, media processing, notifications, expiry |
| Hosting | Vercel or equivalent managed platform | Final choice should follow security, data-residency, and cost review |

The PRD should not treat specific vendors as permanent requirements. Final vendor selection should be recorded separately in architecture decision records.

### 11.3 Core data entities

- `User`
- `InvestorProfile`
- `Project`
- `ProjectContent`
- `ProjectDocument`
- `DocumentVersion`
- `MediaAsset`
- `VideoAsset`
- `AccessRequest`
- `AccessGrant`
- `NdaTemplate`
- `SignedNda`
- `SignatureEvent`
- `AuditLog`
- `AnalyticsEvent`
- `Notification`
- `Invitation`
- `PipelineStatusHistory`
- `ImportJob`
- `ExportJob`

### 11.4 Authorization model

- `canViewPublicTeaser(user, project)` — depends on project visibility setting.
- `canViewProjectBrief(user, project)` — verified registered user or invited prospect.
- `canExpressInterest(user, project)` — verified user, project open, no duplicate active request.
- `canSignNda(user, request)` — request is qualified and NDA has been issued.
- `canAccessConfidentialDocuments(user, project)` — active, non-expired, non-revoked approved access grant.
- `canAccessPrivateMedia(user, media)` — active approved access grant plus media-level permission.
- `canDownloadDocument(user, document)` — approved access plus document-level download permission.
- `canManageProjects(user)` — Super Admin or authorized Internal Project Lead.
- `canImportProjects(user)` — Super Admin only by default.
- `canExportData(user)` — Super Admin only by default; Reviewer access may be configurable.
- `canApproveAccess(user, project)` — Super Admin or authorized Reviewer.
- `canViewAuditLogs(user)` — Super Admin or explicitly authorized Reviewer.
- `canExportAuditLogs(user)` — Super Admin only by default.

Client-side checks are for user experience only. Every document request, media request, signed-URL issuance, API route, and Server Action must independently enforce authorization server-side.

### 11.5 Access-request state machine

```text
NEW
 → UNDER_REVIEW
 → QUALIFIED
 → NDA_SENT
 → NDA_SIGNED
 → DATA_ROOM_APPROVED
 → IN_DISCUSSION
 → TERM_SHEET
 → CLOSED

Alternative exits:
NEW / UNDER_REVIEW / QUALIFIED / NDA_SENT → NOT_A_FIT
DATA_ROOM_APPROVED → REVOKED
DATA_ROOM_APPROVED → EXPIRED
```

Access approval and pipeline stage are related but separate concepts:

- **Access approval** controls whether confidential documents and private media may be accessed.
- **Pipeline stage** tracks commercial progression.

---

## 12. Implementation Phases

### Phase 1 — MVP

Target duration: 6–10 weeks, subject to scope confirmation.

- Authentication, email verification, and session management.
- Project portfolio and project detail pages.
- Public, registered, or invitation-based project visibility.
- Image gallery and basic MP4 video embedding or upload.
- Express Interest form and qualification queue.
- Internal notes and basic pipeline statuses.
- NDA workflow using manual upload or e-signature.
- Project-specific access approval, rejection, revocation, and expiry.
- Confidential document upload, versioning, and watermarked delivery.
- Private media access controls and basic video analytics.
- Audit logging for defined sensitive events.
- Super Admin dashboard for projects, documents, media, users, imports, exports, and analytics.
- Core email notifications.
- Privacy notice and retention-policy foundation.

### Phase 2 — Engagement and control

- E-signature integration.
- Automated watermarking pipeline.
- Access expiry and renewal.
- Richer operator dashboard.
- Investor watchlist.
- Document changelog.
- Bulk tracked download.
- Follow-up reminders.
- More detailed investor profiles.
- Internal-project-lead dashboard.
- Advanced video analytics.

### Phase 3 — Growth and intelligence

- Project comparison.
- Moderated Q&A.
- Arabic and English localization.
- Advanced analytics.
- Saved searches and filters.
- AI brief assistant.
- AI request triage.
- Anomaly detection.
- Meeting-scheduling integration.
- Enhanced CRM and pipeline reporting.

---

## 13. Launch Criteria

DealVault v1 may launch when:

- A prospective investor can register, verify email, view an approved project brief, and submit interest.
- The Super Admin can create, edit, import, export, publish, unpublish, and archive projects.
- The Super Admin can upload, update, replace, archive, and delete documents, images, and MP4 videos.
- The Super Admin can view site traffic, project performance, investor-funnel, media-engagement, and security analytics.
- Confidential documents and private media cannot be accessed without an active approved access grant.
- NDA status is visible and verifiable before access approval.
- Confidential downloads are watermarked and logged.
- Audit logs capture all defined sensitive events.
- Admin actions, imports, exports, and permission changes are logged.
- Privacy notice, cookie/consent approach, and retention policy are published or internally approved.
- Core flows pass security, authorization, accessibility, and mobile-responsive testing.
- Backup, recovery, and incident-response procedures are documented.

---

## 14. Open Questions

1. Should the initial project pages be fully public, invitation-only, or semi-public?
2. Will investors self-register, or will every prospect require an operator-issued invitation?
3. Which e-signature provider best fits the operator’s jurisdiction, budget, and investor base?
4. Will NDAs be platform-wide, project-specific, or both?
5. Which jurisdictions’ investors will be targeted at launch?
6. What is the required audit-log retention period?
7. Should internal project leads be able to see individual investor identities, or only aggregate engagement?
8. Which documents require view-only access versus download access?
9. Should videos be self-hosted or embedded through YouTube, Vimeo, Mux, or Cloudflare Stream?
10. Should access expiry be default-on for all approved prospects?
11. What branding, domain, and project-naming convention will be used?

---

## 15. Approval

| Role | Name | Decision | Date |
|---|---|---|---|
| Product Owner | [Name] |  |  |
| Technical Lead | [Name] |  |  |
| Legal / Compliance | [Name] |  |  |
| Operator / Sponsor | [Name] |  |  |
