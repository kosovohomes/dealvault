import { db, uid } from './store.js';

/*
 * Reading analytics — deliberately slim for Phase 1.
 *
 * The ingest layer keeps first-party document events (opens, heartbeats,
 * section dwell, closes) and derives per-investor per-document progress for
 * the data room UI, plus coarse aggregates for the admin console.
 *
 * Anonymous users cannot post document events: the router only calls ingest
 * with a verified session present. That keeps the record honest.
 */

const DOC_EVENTS = new Set([
  'doc_open',
  'doc_close',
  'doc_review',
  'section_dwell',
  'scroll_depth',
  'heartbeat',
  'download',
  'print',
]);

export function ingest(events, ctx) {
  let count = 0;
  for (const raw of events.slice(0, 40)) {
    const name = String(raw && raw.name || '').slice(0, 40);
    if (!DOC_EVENTS.has(name)) continue;
    if (!ctx.userId) continue; /* no anonymous document events */
    db().events.push({
      id: uid('ev'),
      at: new Date().toISOString(),
      userId: ctx.userId,
      sessionId: ctx.sessionId || '',
      ip: ctx.ip || '',
      name,
      project: String(raw.project || '').slice(0, 60),
      doc: String(raw.doc || '').slice(0, 80),
      section: String(raw.section || '').slice(0, 60),
      value: Number(raw.value) || 0,
      path: String(raw.path || '').slice(0, 160),
      meta: sanitiseMeta(raw.meta),
    });
    count += 1;
  }
  if (count) {
    if (db().events.length > 60000) db().events = db().events.slice(-60000);
  }
  return count;
}

function sanitiseMeta(meta) {
  if (!meta || typeof meta !== 'object') return null;
  const out = {};
  for (const [key, value] of Object.entries(meta).slice(0, 6)) {
    if (typeof value === 'string') out[key.slice(0, 24)] = value.slice(0, 120);
    else if (typeof value === 'number' && Number.isFinite(value)) out[key.slice(0, 24)] = value;
    else if (typeof value === 'boolean') out[key.slice(0, 24)] = value;
  }
  return Object.keys(out).length ? out : null;
}

/* ------------------------- per-user doc progress ------------------------ */

export function userDocProgress(userId, projectSlug) {
  const map = new Map();
  for (const event of db().events) {
    if (event.userId !== userId || event.project !== projectSlug) continue;
    const key = event.doc;
    if (!key) continue;
    const stats =
      map.get(key) ||
      {
        slug: key,
        opened: false,
        reviewed: false,
        activeMs: 0,
        sectionsSeen: 0,
        sections: new Set(),
        maxScroll: 0,
        downloads: 0,
        prints: 0,
        lastAt: null,
      };
    if (event.name === 'doc_open') stats.opened = true;
    if (event.name === 'doc_review') stats.reviewed = true;
    if (event.name === 'download') stats.downloads += 1;
    if (event.name === 'print') stats.prints += 1;
    if (event.name === 'heartbeat' || event.name === 'doc_close') stats.activeMs += Number(event.value) || 0;
    if (event.name === 'section_dwell' && event.section) {
      stats.sections.add(event.section);
      stats.sectionsSeen = stats.sections.size;
    }
    if (event.name === 'scroll_depth') stats.maxScroll = Math.max(stats.maxScroll, Number(event.value) || 0);
    if (!stats.lastAt || event.at > stats.lastAt) stats.lastAt = event.at;
    map.set(key, stats);
  }
  return [...map.values()].map(({ sections, ...rest }) => ({ ...rest, coverage: rest.sectionsSeen }));
}

export function userDocStats(userId, projectSlug, docSlug) {
  return userDocProgress(userId, projectSlug).find((doc) => doc.slug === docSlug) || null;
}

/* ----------------------------- aggregates ------------------------------ */

export function requestFunnel() {
  const counts = { total: 0, nda_pending: 0, nda_signed: 0, approved: 0, rejected: 0, revoked: 0 };
  for (const request of db().requests) {
    counts.total += 1;
    if (counts[request.status] !== undefined) counts[request.status] += 1;
  }
  return counts;
}

export function userStats() {
  const users = db().users;
  return {
    total: users.length,
    verified: users.filter((user) => user.emailVerifiedAt).length,
    ndaSigned: users.filter((user) => user.nda && user.nda.signedAt).length,
    suspended: users.filter((user) => user.status === 'suspended').length,
  };
}

export function projectInterest() {
  const out = {};
  for (const request of db().requests) {
    out[request.projectSlug] = (out[request.projectSlug] || 0) + 1;
  }
  return out;
}

export function recentAudit(limit = 60, filter = {}) {
  const rows = db().audit.slice().reverse();
  return rows
    .filter((row) => {
      if (filter.action && !String(row.action).startsWith(filter.action)) return false;
      if (filter.userId && row.userId !== filter.userId) return false;
      if (filter.project && row.project !== filter.project) return false;
      return true;
    })
    .slice(0, limit);
}

export function describeAudit(row) {
  const labels = {
    'auth.register': 'Account created',
    'auth.email_verified': 'Email verified',
    'auth.login': 'Signed in',
    'auth.login_failed': 'Sign-in failed',
    'auth.logout': 'Signed out',
    'auth.password_reset_requested': 'Password reset requested',
    'auth.password_reset': 'Password changed',
    'auth.all_sessions_revoked': 'All sessions revoked (self)',
    'request.created': 'Interest expressed',
    'nda.signed': 'NDA signed',
    'request.approved': 'Request approved',
    'request.rejected': 'Request rejected',
    'request.revoked': 'Access revoked',
    'doc.opened': 'Document opened',
    'doc.downloaded': 'Document downloaded',
    'doc.printed': 'Document printed',
    'doc.reviewed': 'Document marked reviewed',
    'question.created': 'Question asked',
    'admin.login': 'Console sign-in',
    'admin.logout': 'Console sign-out',
    'admin.request_decided': 'Request decision',
    'admin.user_updated': 'Investor record updated',
    'import.dry_run': 'Project import validated (dry run)',
    'import.commit': 'Project import committed',
    'import.commit_rejected': 'Project import rejected at validation',
  };
  return labels[row.action] || row.action;
}
