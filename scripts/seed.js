/*
 * Seed the store with demo investors, requests and audit history so the
 * platform has a live feel on first run. Runs only against an empty store
 * unless --force is passed (which rebuilds from scratch).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const DATA_FILE = path.join(ROOT, 'data', 'store.json');
const SEED_FILE = path.join(ROOT, 'data', 'seed-template.json');

const force = process.argv.includes('--force');

/* Minimal scrypt hashing, mirroring server/auth.js — no imports across the app. */
import crypto from 'node:crypto';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return { salt, hash, algo: 'scrypt:16384:8:1' };
}

const iso = (daysAgo, hour = 10) => {
  const stamp = new Date(Date.now() - daysAgo * 86400000);
  stamp.setUTCHours(hour, (daysAgo * 13) % 60, 0, 0);
  return stamp.toISOString();
};

function build() {
  const users = [];
  const requests = [];
  const events = [];
  const audit = [];
  const questions = [];

  const aid = (n) => `aud_seed_${String(n).padStart(3, '0')}`;
  let auditNo = 0;
  const A = (daysAgo, action, detail) => {
    auditNo += 1;
    audit.push({ id: aid(auditNo), at: iso(daysAgo, 9 + (auditNo % 8)), action, ...detail });
  };

  /* ---------------- investors ---------------- */

  const mk = (n, name, email, firm, country, type, ticket, days, verifiedDays, ndaDays) => {
    const user = {
      id: `inv_seed_${n}`,
      name,
      email,
      firm,
      country,
      role: 'investor',
      status: 'active',
      password: hashPassword('DealVault#Demo2026'),
      emailVerifiedAt: verifiedDays == null ? null : iso(verifiedDays, 11),
      createdAt: iso(days, 10),
      lastSeenAt: iso(Math.max(0, days - 1), 16),
      qualification: { type, ticket, accredited: true, accreditedAt: iso(days, 10) },
      nda: null,
      source: { userAgent: 'seed' },
    };
    if (ndaDays != null) {
      user.nda = {
        version: 'DV-CONF-2026.1',
        hash: 'seed-hash-not-real',
        documentHash: 'seed-doc-hash',
        signedName: name,
        initials: name.split(/\s+/).map((p) => p[0]).join('').toUpperCase(),
        signedAt: iso(ndaDays, 12),
        receipt: `DV-${iso(ndaDays, 12).replace(/[-:TZ.]/g, '').slice(0, 14)}-S${n}`,
        ip: '10.0.0.' + n,
        ua: 'seed',
        consents: ['nda', 'monitoring', 'noOffer', 'data', 'electronic'],
      };
    }
    users.push(user);
    A(days, 'auth.register', { userId: user.id, email, ip: '10.0.0.' + n });
    if (verifiedDays != null) A(verifiedDays, 'auth.email_verified', { userId: user.id, email, ip: '10.0.0.' + n });
    if (ndaDays != null) A(ndaDays, 'nda.signed', { userId: user.id, receipt: user.nda.receipt, version: 'DV-CONF-2026.1' });
    return user;
  };

  mk(1, 'Layla Haddad', 'layla.haddad@levanthorizon.com', 'Levant Horizon Partners', 'Jordan', 'vc', '250k-1m', 41, 41, 40);
  mk(2, 'Omar Nasser', 'omar@meridiangrowth.com', 'Meridian Growth', 'UAE', 'vc', '1m-plus', 38, 38, 37);
  mk(3, 'Sara Khoury', 'sara@cedarfo.com', 'Cedar Family Office', 'Lebanon', 'family', '1m-plus', 35, 35, 34);
  mk(4, 'Yousef Ammari', 'yousef@ammanangels.com', 'Amman Angels', 'Jordan', 'angel', '50k-250k', 30, 30, 29);
  mk(5, 'Nadia Rahim', 'nadia@gulfbridge.capital', 'Gulf Bridge Capital', 'Saudi Arabia', 'strategic', '1m-plus', 22, 21, 20);
  mk(6, 'Tariq Sultan', 'tariq@rum-equity.com', 'Rum Equity', 'Jordan', 'vc', '250k-1m', 15, 15, 14);
  mk(7, 'Elena Voss', 'elena@northstarcollective.eu', 'Northstar Collective', 'Germany', 'vc', '250k-1m', 9, 9, 8);
  mk(8, 'Hassan Al-Dunes', 'hassan@dunesfamily.sa', 'Dunes Family Office', 'Saudi Arabia', 'family', '1m-plus', 4, 3, null);
  mk(9, 'Mariam Zeidan', 'mariam@levantseed.com', 'Levant Seed', 'Jordan', 'vc', '250k-1m', 26, 26, 25);

  const [layla, omar, sara, yousef, nadia, tariq, elena, hassan, mariam] = users;

  const R = (user, project, status, days, extra = {}) => {
    const request = {
      id: `req_seed_${project.split('-')[0]}_${user.id.slice(-2)}`,
      userId: user.id,
      projectSlug: project,
      status,
      createdAt: iso(days, 13),
      updatedAt: iso(Math.max(0, days - 1), 15),
      ndaSignedAt: user.nda ? user.nda.signedAt : null,
      approvedAt: status === 'approved' ? iso(Math.max(0, days - 1), 15) : null,
      approvedBy: status === 'approved' ? 'console' : null,
      decidedAt: ['approved', 'rejected', 'revoked'].includes(status) ? iso(Math.max(0, days - 1), 15) : null,
      decisionNote: extra.note || '',
      receipt: user.nda ? user.nda.receipt : null,
    };
    requests.push(request);
    A(days, 'request.created', { userId: user.id, project, requestId: request.id });
    if (status === 'approved') A(Math.max(0, days - 1), 'request.approved', { requestId: request.id, userId: user.id, project });
    if (status === 'rejected') A(Math.max(0, days - 1), 'request.rejected', { requestId: request.id, userId: user.id, project, note: extra.note || '' });
    if (status === 'revoked') A(Math.max(0, days - 1), 'request.revoked', { requestId: request.id, userId: user.id, project, note: extra.note || '' });
    return request;
  };

  /* CafePass room activity: Layla (deep), Omar (mid), Sara (light), Tariq approved not started, Mariam revoked. */
  R(layla, 'cafepass-amman', 'approved', 40);
  R(omar, 'cafepass-amman', 'approved', 36);
  R(sara, 'cafepass-amman', 'approved', 33);
  R(tariq, 'cafepass-amman', 'approved', 13, { note: 'Met at Amman founder dinner.' });
  R(mariam, 'cafepass-amman', 'revoked', 24, { note: 'Fund mandate changed.' });
  R(layla, 'sakan', 'approved', 20);
  R(omar, 'sakan', 'nda_signed', 18);
  R(nadia, 'sakan', 'approved', 12);
  R(hassan, 'sakan', 'nda_pending', 2);
  R(sara, 'nakhlah', 'nda_signed', 8);
  R(elena, 'nakhlah', 'nda_pending', 3);
  R(yousef, 'nakhlah', 'rejected', 10, { note: 'Ticket below project minimum for this round.' });

  /* ---------------- reading events (CafePass + Sakan) ---------------- */

  let evNo = 0;
  const ev = (user, daysAgo, project, doc, name, extra = {}) => {
    evNo += 1;
    events.push({
      id: `ev_seed_${String(evNo).padStart(4, '0')}`,
      at: iso(daysAgo, 14 + (evNo % 6)),
      userId: user.id,
      sessionId: 'seed',
      ip: '10.0.0.2',
      name,
      project,
      doc,
      section: extra.section || '',
      value: extra.value || 0,
      path: `/room/${project}/${doc}`,
      meta: null,
    });
  };

  const cpDocs = [
    { slug: 'cp-investment-memo', sections: ['proposal', 'problem', 'model', 'plan', 'must-be-true'] },
    { slug: 'cp-market-study', sections: ['method', 'sizing', 'segments', 'competition'] },
    { slug: 'cp-unit-economics', sections: ['revenue', 'member', 'cafe', 'sensitivity'] },
  ];

  const simulate = (user, project, docs, depth, startDays) => {
    docs.slice(0, depth).forEach((doc, docIndex) => {
      const day = Math.max(1, startDays - docIndex * 2);
      ev(user, day, project, doc.slug, 'doc_open');
      const seen = docIndex === 0 ? doc.sections.length : Math.max(1, doc.sections.length - 1);
      doc.sections.slice(0, seen).forEach((section, sIndex) => {
        ev(user, day, project, doc.slug, 'section_dwell', { section: section.id, value: 140 + sIndex * 30 });
      });
      ev(user, day, project, doc.slug, 'heartbeat', { value: 240000 + docIndex * 60000 });
      ev(user, day, project, doc.slug, 'scroll_depth', { value: docIndex === 0 ? 100 : 72 });
      ev(user, day, project, doc.slug, 'doc_close', { value: 260000 + docIndex * 55000 });
      ev(user, day, project, doc.slug, 'doc_review');
      if (docIndex === 0) ev(user, Math.max(0, day - 1), project, doc.slug, 'download');
    });
  };

  simulate(layla, 'cafepass-amman', cpDocs, 3, 39);
  simulate(omar, 'cafepass-amman', cpDocs, 2, 35);
  simulate(sara, 'cafepass-amman', cpDocs.slice(0, 1), 1, 32);
  simulate(layla, 'sakan', [{ slug: 'sk-investment-thesis', sections: ['gap', 'supply', 'model', 'round'] }], 1, 19);
  simulate(nadia, 'sakan', [{ slug: 'sk-investment-thesis', sections: ['gap', 'supply', 'model', 'round'] }, { slug: 'sk-market-primer', sections: ['demand', 'corridors', 'corporate'] }], 2, 11);

  A(33, 'doc.downloaded', { userId: sara.id, project: 'cafepass-amman', doc: 'cp-investment-memo' });
  A(18, 'doc.downloaded', { userId: layla.id, project: 'cafepass-amman', doc: 'cp-investment-memo' });
  A(10, 'doc.downloaded', { userId: layla.id, project: 'sakan', doc: 'sk-investment-thesis' });
  A(29, 'auth.login', { userId: omar.id, email: omar.email, ip: '10.0.0.2' });

  /* ---------------- questions ---------------- */

  questions.push(
    {
      id: 'q_seed_1',
      userId: layla.id,
      userName: layla.name,
      firm: layla.firm,
      projectSlug: 'cafepass-amman',
      docSlug: 'cp-unit-economics',
      body: 'The contribution table shows support at JOD 0.40 per member. What does the support cost consist of at 4,000 members — is that one part-time person plus tooling, or an outsourced line?',
      status: 'answered',
      createdAt: iso(31, 15),
      reply: 'Tooling plus one part-time ops hire at target scale; the line is fully loaded in the model. Happy to walk through the operating cost stack on a call.',
      repliedAt: iso(30, 11),
    },
    {
      id: 'q_seed_2',
      userId: omar.id,
      userName: omar.name,
      firm: omar.firm,
      projectSlug: 'cafepass-amman',
      docSlug: 'cp-investment-memo',
      body: 'Gate 2 requires 65 cafés. What does the café signing pipeline look like today — how many LOIs, and what is the get-to-signed motion?',
      status: 'answered',
      createdAt: iso(34, 16),
      reply: '12 signed letters of intent from the West Amman corridor, referral-driven. The signing motion is a two-visit close: owner demo, then a one-page perk agreement.',
      repliedAt: iso(33, 10),
    },
    {
      id: 'q_seed_3',
      userId: nadia.id,
      userName: nadia.name,
      firm: nadia.firm,
      projectSlug: 'sakan',
      docSlug: 'sk-early-metrics',
      body: 'Occupancy at 71% versus the 78% target — how much of the 7-point gap do you expect the verification layer to close, versus corridor mix?',
      status: 'open',
      createdAt: iso(9, 17),
      reply: null,
      repliedAt: null,
    },
  );

  return {
    version: 1,
    meta: { createdAt: new Date().toISOString(), seeded: true, lastWritten: null },
    users,
    requests,
    sessions: {},
    adminSessions: {},
    codes: {},
    events,
    questions,
    audit,
  };
}

if (!force && fs.existsSync(DATA_FILE)) {
  const existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if ((existing.users || []).length > 0) {
    console.log('[seed] store already has data — pass --force to rebuild.');
    process.exit(0);
  }
}

const store = build();
fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 1), 'utf8');
console.log(`[seed] wrote ${store.users.length} investors, ${store.requests.length} requests, ${store.events.length} events, ${store.audit.length} audit rows → ${path.relative(ROOT, DATA_FILE)}`);
if (!fs.existsSync(SEED_FILE)) {
  /* Template copy used by tests and demos; the runtime seed lives in store.json. */
  fs.writeFileSync(SEED_FILE, JSON.stringify(store, null, 1), 'utf8');
}
console.log('[seed] demo password for every seeded investor: DealVault#Demo2026');
