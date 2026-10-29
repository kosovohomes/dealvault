import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import {
  ADMIN_KEY,
  CONTACT_EMAIL,
  DEV_MODE,
  IS_SERVERLESS,
  NDA_VERSION,
  PLATFORM_NAME,
  PUBLIC_DIR,
} from './config.js';
import {
  adminLogin,
  adminLogout,
  clientIp,
  cookie,
  createSession,
  codeCooldown,
  currentUser,
  destroyAllSessions,
  destroySession,
  hashPassword,
  isAdmin,
  isSecure,
  issueCode,
  makeReceipt,
  newId,
  passwordStrength,
  safeEqual,
  sha256,
  verifyCode,
  verifyPassword,
} from './auth.js';
import {
  audit,
  db,
  findRequest,
  findUserByEmail,
  flush,
  init,
  publicUser,
  REMOTE,
  touch,
} from './store.js';
import {
  describeAudit,
  ingest,
  projectInterest,
  recentAudit,
  requestFunnel,
  userDocProgress,
  userDocStats,
  userStats,
} from './analytics.js';
import { catalogue, getDocument, getProject, indexProject, projectIndex } from './content.js';
import { agreement, agreementHash, agreementText, consentItems } from './legal.js';
import {
  IMPORT_MAX_BYTES,
  IMPORT_MAX_PROJECTS,
  applyImport,
  buildImport,
  isXlsx,
  templateCsv,
} from './importer.js';

const started = Date.now();

/* ------------------------------------------------------------------ */
/* Utilities                                                           */
/* ------------------------------------------------------------------ */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const PAGE_ROUTES = {
  '/': 'index.html',
  '/register': 'register.html',
  '/verify': 'verify.html',
  '/login': 'login.html',
  '/forgot': 'forgot.html',
  '/nda': 'nda.html',
  '/projects': 'projects.html',
  '/account': 'account.html',
  '/admin': 'admin.html',
  '/legal': 'legal.html',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};

function json(res, status, payload, extra = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...SECURITY_HEADERS,
    ...extra,
  });
  res.end(body);
}

function html(res, status, body, extra = {}) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    ...SECURITY_HEADERS,
    ...extra,
  });
  res.end(body);
}

function redirect(res, location, extra = {}) {
  res.writeHead(302, { Location: location, 'Cache-Control': 'no-store', ...extra });
  res.end();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function readBody(req, limit = 1_000_000) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('Payload too large'), { status: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error('Invalid JSON'), { status: 400 });
  }
}

/* Raw body for file uploads (project import). Returns a Buffer. */
async function readRaw(req, limit = IMPORT_MAX_BYTES + 1) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('File too large'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const rateBuckets = new Map();
function rateLimit(key, limit, windowMs) {
  const stamp = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.reset < stamp) {
    rateBuckets.set(key, { count: 1, reset: stamp + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.reset - stamp) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

setInterval(() => {
  const stamp = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (bucket.reset < stamp) rateBuckets.delete(key);
  }
}, 120000).unref();

function validOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

function requireSameOrigin(req, res) {
  if (validOrigin(req)) return true;
  json(res, 403, { error: 'origin_rejected' });
  return false;
}

function safeNext(value, fallback = '/projects') {
  const next = String(value || '');
  if (!next.startsWith('/') || next.startsWith('//')) return fallback;
  return next;
}

const clean = (value, max = 200) => String(value ?? '').trim().slice(0, max);
const normalName = (value) => clean(value, 120).replace(/\s+/g, ' ').toLowerCase();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function sessionHeader(req) {
  return clean(req.headers['x-dv-session'], 48);
}

function trackServer(userId, req, name, extra = {}) {
  ingest(
    [{ name, project: extra.project || '', doc: extra.doc || '', path: extra.path || req.headers['x-dv-path'] || '', value: extra.value || 0, meta: extra.meta }],
    { userId, sessionId: sessionHeader(req), ip: clientIp(req) },
  );
}

/* Ticket like 'US$500K' or 'US$1.2M' → 500000 / 1200000. */
function ticketUsd(ticket) {
  const match = /([\d.]+)\s*(K|M)/i.exec(String(ticket || ''));
  if (!match) return 0;
  const value = Number(match[1]) || 0;
  return /M/i.test(match[2]) ? value * 1_000_000 : value * 1_000;
}

/* Projects in these states are operator-side only — never shown to investors. */
const HIDDEN_STATUSES = new Set(['draft', 'paused']);

/* ------------------------------------------------------------------ */
/* Watermarked, printable document copy                                */
/* ------------------------------------------------------------------ */

function downloadDocument(project, doc, user) {
  const stamp = new Date();
  const receipt = user.nda?.receipt || '—';
  const request = findRequest(user.id, project.slug);
  const safeName = user.name.replace(/[^\w\s-]/g, '');
  const watermark = `${safeName} · ${user.email} · ${stamp.toISOString().slice(0, 10)}`;

  const sections = doc.sections
    .map(
      (section) => `
      <section>
        <h2>${escapeHtml(section.title)}</h2>
        ${section.html}
      </section>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${escapeHtml(doc.title)} — ${escapeHtml(project.title)}</title>
<meta name="robots" content="noindex,nofollow">
<style>
  @page { size: A4; margin: 20mm 18mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #1b1a16; font: 15px/1.65 "Helvetica Neue", Arial, sans-serif; }
  .watermark { position: fixed; inset: 0; pointer-events: none; z-index: 9; opacity: .055;
    display: flex; align-items: center; justify-content: center; }
  .watermark span { font-size: 22px; letter-spacing: .28em; transform: rotate(-32deg); text-transform: uppercase; white-space: nowrap; }
  .cover { border-bottom: 2px solid #214534; padding-bottom: 24px; margin-bottom: 28px; }
  .eyebrow { font-size: 10px; letter-spacing: .28em; text-transform: uppercase; color: #8a6a2c; }
  h1 { font-family: Georgia, serif; font-size: 34px; line-height: 1.1; margin: 10px 0 6px; }
  .sub { color: #555; font-size: 16px; margin: 0; }
  .meta { display: flex; gap: 24px; flex-wrap: wrap; font-size: 11px; color: #666; margin-top: 18px; }
  h2 { font-family: Georgia, serif; font-size: 21px; margin: 34px 0 10px; border-top: 1px solid #ddd5c4; padding-top: 18px; }
  h3 { font-size: 15px; margin: 20px 0 6px; }
  p { margin: 0 0 12px; }
  ul, ol { margin: 0 0 14px 20px; padding: 0; }
  li { margin-bottom: 6px; }
  blockquote { margin: 18px 0; padding: 12px 18px; border-left: 2px solid #b0862f; font-family: Georgia, serif; font-size: 17px; color: #214534; }
  table { width: 100%; border-collapse: collapse; margin: 14px 0 18px; font-size: 12.5px; }
  th { text-align: left; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: #666; border-bottom: 1px solid #b0862f; padding: 7px 8px; }
  td { border-bottom: 1px solid #e6dfd1; padding: 7px 8px; vertical-align: top; }
  .figures { display: flex; gap: 12px; margin: 18px 0; flex-wrap: wrap; }
  .figure { border: 1px solid #e0d8c8; padding: 12px 16px; min-width: 150px; }
  .figure strong { display: block; font-family: Georgia, serif; font-size: 24px; }
  .figure small { display: block; margin-top: 4px; font-size: 10px; color: #777; }
  .callout { background: #f4f0e6; border-left: 2px solid #b0862f; padding: 14px 18px; margin: 18px 0; font-size: 13px; }
  .callout__label { display: block; font-size: 9px; letter-spacing: .2em; text-transform: uppercase; color: #8a6a2c; margin-bottom: 4px; }
  .note { font-size: 11px; color: #777; font-style: italic; }
  .audit { margin-top: 40px; border-top: 1px solid #214534; padding-top: 12px; font-size: 10px; color: #666; line-height: 1.6; }
</style></head>
<body>
  <div class="watermark"><span>${escapeHtml(watermark)}</span></div>
  <div class="cover">
    <div class="eyebrow">${escapeHtml(PLATFORM_NAME)} · ${escapeHtml(project.title)} · ${escapeHtml(doc.category)} · ${escapeHtml(doc.sensitivity)}</div>
    <h1>${escapeHtml(doc.title)}</h1>
    <p class="sub">${escapeHtml(doc.subtitle)}</p>
    <div class="meta">
      <span>Version ${escapeHtml(doc.version)}</span>
      <span>Updated ${escapeHtml(doc.updated)}</span>
      <span>${doc.pages} pages · ${doc.minutes} min read</span>
    </div>
  </div>
  ${sections}
  <div class="audit">
    <strong>Confidential — personal copy.</strong> Issued to ${escapeHtml(user.name)} (${escapeHtml(user.email)})
    on ${stamp.toUTCString()}. Access receipt ${escapeHtml(receipt)}${request ? `; request ${escapeHtml(request.id)}` : ''}.
    Agreement ${escapeHtml(NDA_VERSION)}. This copy is watermarked and its download is recorded.
    Redistribution is prohibited without written consent. Figures are illustrative planning cases, not an offer of securities.
  </div>
</body></html>`;
}

/* ------------------------------------------------------------------ */
/* Auth handlers                                                       */
/* ------------------------------------------------------------------ */

const INVESTOR_TYPES = ['angel', 'vc', 'family', 'strategic', 'other'];
const TICKETS = ['under50k', '50k-250k', '250k-1m', '1m-plus', 'undecided'];

async function handleRegister(req, res) {
  const ip = clientIp(req);
  const limit = rateLimit(`register:${ip}`, 8, 3600000);
  if (!limit.ok) return json(res, 429, { error: 'rate_limited', retryAfter: limit.retryAfter });

  const body = await readBody(req);
  const name = clean(body.name, 120);
  const email = clean(body.email, 160).toLowerCase();
  const firm = clean(body.firm, 160);
  const country = clean(body.country, 80);
  const password = String(body.password || '');
  const qualification = body.qualification || {};

  const fail = (field, message) => json(res, 400, { error: 'validation', field, message });

  if (name.length < 3) return fail('name', 'Please enter your full name.');
  if (!EMAIL_RE.test(email)) return fail('email', 'Please enter a valid email address.');
  if (firm.length < 2) return fail('firm', 'Please enter your firm or company.');
  if (country.length < 2) return fail('country', 'Please select a jurisdiction.');
  const strength = passwordStrength(password);
  if (strength) return fail('password', strength);
  if (!INVESTOR_TYPES.includes(qualification.type)) return fail('type', 'Please select an investor type.');
  if (!TICKETS.includes(qualification.ticket)) return fail('ticket', 'Please indicate a ticket size.');
  if (qualification.accredited !== true) return fail('accredited', 'Please confirm your investor status.');

  if (findUserByEmail(email)) {
    return json(res, 409, {
      error: 'exists',
      message: 'An account with this email already exists. Sign in instead.',
      login: `/login?email=${encodeURIComponent(email)}`,
    });
  }

  const stamp = new Date().toISOString();
  const passwordRecord = hashPassword(password);
  const user = {
    id: newId('inv'),
    name,
    email,
    firm,
    country,
    role: 'investor',
    status: 'active',
    password: passwordRecord,
    emailVerifiedAt: null,
    createdAt: stamp,
    lastSeenAt: null,
    qualification: {
      type: qualification.type,
      ticket: qualification.ticket,
      accredited: true,
      accreditedAt: stamp,
    },
    nda: null,
    source: { userAgent: clean(req.headers['user-agent'], 240) },
  };

  db().users.push(user);
  audit('auth.register', { userId: user.id, email, ip });
  const code = issueCode('verify', email, req);
  await flush();

  console.log(`[register] ${name} <${email}> · ${firm}`);
  return json(res, 201, {
    ok: true,
    email,
    next: `/verify?email=${encodeURIComponent(email)}`,
    demoCode: DEV_MODE ? code : undefined,
  });
}

async function handleVerify(req, res) {
  const ip = clientIp(req);
  const limit = rateLimit(`verify:${ip}`, 20, 600000);
  if (!limit.ok) return json(res, 429, { error: 'rate_limited', retryAfter: limit.retryAfter });

  const body = await readBody(req);
  const email = clean(body.email, 160).toLowerCase();
  const code = clean(body.code, 10);
  const user = findUserByEmail(email);
  if (!user) return json(res, 404, { error: 'not_found', message: 'No account found for this email.' });

  const result = verifyCode('verify', email, code);
  if (!result.ok) {
    const messages = {
      no_code: 'No active code. Request a new one.',
      expired: 'That code has expired. Request a new one.',
      invalid: 'That code is not correct.',
      locked: 'Too many attempts. Request a new code.',
    };
    audit('auth.verify_failed', { userId: user.id, email, reason: result.reason, ip });
    return json(res, 401, { error: result.reason, message: messages[result.reason] });
  }

  if (!user.emailVerifiedAt) {
    user.emailVerifiedAt = new Date().toISOString();
    audit('auth.email_verified', { userId: user.id, email, ip });
  }
  const { token } = createSession(user, req);
  await flush();

  return json(res, 200, {
    ok: true,
    user: publicUser(user),
    next: safeNext(body.next),
  }, {
    'Set-Cookie': cookie('dv_sid', token, { maxAge: 7 * 86400, secure: isSecure(req) }),
  });
}

async function handleResendCode(req, res) {
  const ip = clientIp(req);
  const body = await readBody(req);
  const email = clean(body.email, 160).toLowerCase();
  if (!EMAIL_RE.test(email)) return json(res, 400, { error: 'invalid_email' });
  const user = findUserByEmail(email);
  if (!user) return json(res, 404, { error: 'not_found' });

  const cooldown = codeCooldown('verify', email);
  if (cooldown > 0) return json(res, 429, { error: 'cooldown', retryAfter: cooldown });
  const limit = rateLimit(`resend:${email}`, 6, 900000);
  if (!limit.ok) return json(res, 429, { error: 'rate_limited', retryAfter: limit.retryAfter });

  const purpose = body.purpose === 'reset' ? 'reset' : 'verify';
  const code = issueCode(purpose, email, req);
  audit('auth.code_resent', { userId: user.id, email, purpose, ip });
  await flush();
  return json(res, 200, { ok: true, cooldown: 45, demoCode: DEV_MODE ? code : undefined });
}

async function handleLogin(req, res) {
  const ip = clientIp(req);
  const limit = rateLimit(`login:${ip}`, 12, 900000);
  if (!limit.ok) return json(res, 429, { error: 'rate_limited', retryAfter: limit.retryAfter });

  const body = await readBody(req);
  const email = clean(body.email, 160).toLowerCase();
  const password = String(body.password || '');
  const user = findUserByEmail(email);

  if (!user || !verifyPassword(password, user.password)) {
    audit('auth.login_failed', { email, ip, userId: user ? user.id : null });
    await flush();
    return json(res, 401, { error: 'invalid_credentials', message: 'Email or password is not correct.' });
  }
  if (user.status === 'suspended') {
    return json(res, 403, { error: 'suspended', message: 'This account has been suspended. Contact the platform team.' });
  }

  const { token } = createSession(user, req);
  audit('auth.login', { userId: user.id, email, ip });
  await flush();

  const next = user.emailVerifiedAt
    ? safeNext(body.next)
    : `/verify?email=${encodeURIComponent(email)}${body.next ? `&next=${encodeURIComponent(body.next)}` : ''}`;
  return json(res, 200, {
    ok: true,
    user: publicUser(user),
    next,
  }, {
    'Set-Cookie': cookie('dv_sid', token, { maxAge: 7 * 86400, secure: isSecure(req) }),
  });
}

async function handleLogout(req, res) {
  if (!requireSameOrigin(req, res)) return;
  const user = currentUser(req);
  if (user) audit('auth.logout', { userId: user.id });
  destroySession(req);
  await flush();
  json(res, 200, { ok: true }, {
    'Set-Cookie': cookie('dv_sid', '', { maxAge: 0, secure: isSecure(req) }),
  });
}

async function handleLockAccount(req, res) {
  if (!requireSameOrigin(req, res)) return;
  const user = currentUser(req);
  if (!user) return json(res, 401, { error: 'unauthorized' });
  destroyAllSessions(user.id);
  audit('auth.all_sessions_revoked', { userId: user.id });
  await flush();
  json(res, 200, { ok: true }, {
    'Set-Cookie': cookie('dv_sid', '', { maxAge: 0, secure: isSecure(req) }),
  });
}

async function handleResetRequest(req, res) {
  const ip = clientIp(req);
  const limit = rateLimit(`reset:${ip}`, 8, 3600000);
  if (!limit.ok) return json(res, 429, { error: 'rate_limited', retryAfter: limit.retryAfter });

  const body = await readBody(req);
  const email = clean(body.email, 160).toLowerCase();
  const user = findUserByEmail(email);
  /* Do not reveal whether the account exists. */
  if (!user) return json(res, 200, { ok: true, email, sent: true });

  const cooldown = codeCooldown('reset', email);
  if (cooldown > 0) return json(res, 429, { error: 'cooldown', retryAfter: cooldown });
  const code = issueCode('reset', email, req);
  audit('auth.password_reset_requested', { userId: user.id, email, ip });
  await flush();
  return json(res, 200, { ok: true, email, sent: true, demoCode: DEV_MODE ? code : undefined });
}

async function handleResetConfirm(req, res) {
  const ip = clientIp(req);
  const limit = rateLimit(`reset-confirm:${ip}`, 10, 3600000);
  if (!limit.ok) return json(res, 429, { error: 'rate_limited', retryAfter: limit.retryAfter });

  const body = await readBody(req);
  const email = clean(body.email, 160).toLowerCase();
  const code = clean(body.code, 10);
  const password = String(body.password || '');
  const user = findUserByEmail(email);
  if (!user) return json(res, 404, { error: 'not_found' });

  const result = verifyCode('reset', email, code);
  if (!result.ok) {
    const messages = {
      no_code: 'No active reset code. Request a new one.',
      expired: 'That reset code has expired. Request a new one.',
      invalid: 'That reset code is not correct.',
      locked: 'Too many attempts. Request a new code.',
    };
    return json(res, 401, { error: result.reason, message: messages[result.reason] });
  }

  const strength = passwordStrength(password);
  if (strength) return json(res, 400, { error: 'validation', field: 'password', message: strength });

  user.password = hashPassword(password);
  destroyAllSessions(user.id);
  audit('auth.password_reset', { userId: user.id, email, ip });
  await flush();
  return json(res, 200, { ok: true, next: '/login?reset=1' });
}

/* ------------------------------------------------------------------ */
/* Projects, requests, NDA                                             */
/* ------------------------------------------------------------------ */

function requireVerified(req, res) {
  const user = currentUser(req);
  if (!user) {
    json(res, 401, { error: 'unauthorized' });
    return null;
  }
  if (!user.emailVerifiedAt) {
    json(res, 403, { error: 'unverified', message: 'Verify your email address first.' });
    return null;
  }
  return user;
}

async function handleProjectList(req, res, url) {
  const user = requireVerified(req, res);
  if (!user) return;

  const sector = clean(url.searchParams.get('sector'), 80);
  const stage = clean(url.searchParams.get('stage'), 40);
  const geography = clean(url.searchParams.get('geography'), 80);
  const bucket = clean(url.searchParams.get('ticket'), 20);
  const query = clean(url.searchParams.get('q'), 80).toLowerCase();

  let list = projectIndex()
    .filter((project) => !HIDDEN_STATUSES.has(project.status))
    .map((project) => ({
      ...project,
      ticketUsd: ticketUsd(project.ticket),
      request: requestSummary(user, project.slug),
    }));

  if (sector) list = list.filter((project) => project.sector === sector);
  if (stage) list = list.filter((project) => project.stage === stage);
  if (geography) list = list.filter((project) => project.geography === geography);
  if (bucket) {
    list = list.filter((project) => {
      if (bucket === 'under500k') return project.ticketUsd > 0 && project.ticketUsd < 500000;
      if (bucket === '500k-1m') return project.ticketUsd >= 500000 && project.ticketUsd < 1000000;
      if (bucket === '1m-plus') return project.ticketUsd >= 1000000;
      return true;
    });
  }
  if (query) {
    list = list.filter((project) =>
      `${project.title} ${project.tagline} ${project.summary} ${project.sector} ${project.geography}`
        .toLowerCase()
        .includes(query),
    );
  }

  const visible = projectIndex().filter((project) => !HIDDEN_STATUSES.has(project.status));
  return json(res, 200, {
    projects: list,
    totals: { projects: visible.length, documents: catalogue().documents, pages: catalogue().pages },
    facets: {
      sectors: [...new Set(visible.map((project) => project.sector))],
      stages: [...new Set(visible.map((project) => project.stage))],
      geographies: [...new Set(visible.map((project) => project.geography))],
    },
  });
}

function requestSummary(user, projectSlug) {
  const request = findRequest(user.id, projectSlug);
  if (!request) return null;
  return {
    id: request.id,
    status: request.status,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    approvedAt: request.approvedAt || null,
  };
}

async function handleProjectDetail(req, res, slug) {
  const user = requireVerified(req, res);
  if (!user) return;
  const project = getProject(slug);
  if (!project || HIDDEN_STATUSES.has(project.status)) {
    return json(res, 404, { error: 'not_found', message: 'This project is not on the platform.' });
  }

  trackServer(user.id, req, 'project_view', { project: slug, path: `/projects/${slug}` });
  touch();

  const request = requestSummary(user, slug);
  return json(res, 200, {
    project: { ...indexProject(project), ticketUsd: ticketUsd(project.ticket) },
    request,
    user: publicUser(user),
  });
}

async function handleExpressInterest(req, res, slug) {
  if (!requireSameOrigin(req, res)) return;
  const user = requireVerified(req, res);
  if (!user) return;
  const project = getProject(slug);
  if (!project || HIDDEN_STATUSES.has(project.status)) return json(res, 404, { error: 'not_found' });

  const existing = findRequest(user.id, slug);
  if (existing) {
    return json(res, 409, { error: 'exists', message: 'You have already expressed interest in this project.', request: requestSummary(user, slug) });
  }

  const ndaDone = Boolean(user.nda && user.nda.signedAt);
  const request = {
    id: newId('req'),
    userId: user.id,
    projectSlug: slug,
    status: ndaDone ? 'nda_signed' : 'nda_pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ndaSignedAt: ndaDone ? user.nda.signedAt : null,
    approvedAt: null,
    approvedBy: null,
    decidedAt: null,
    decisionNote: '',
    receipt: ndaDone ? user.nda.receipt : null,
  };
  db().requests.push(request);
  audit('request.created', { userId: user.id, project: slug, requestId: request.id, ip: clientIp(req) });
  await flush();
  console.log(`[interest] ${user.email} → ${slug} (${request.status})`);

  return json(res, 201, {
    ok: true,
    request: requestSummary(user, slug),
    ndaSigned: ndaDone,
    next: ndaDone ? `/projects/${slug}` : `/nda?project=${encodeURIComponent(slug)}`,
  });
}

async function handleNdaSign(req, res) {
  if (!requireSameOrigin(req, res)) return;
  const user = requireVerified(req, res);
  if (!user) return;

  const body = await readBody(req);
  const signature = clean(body.signature, 120);
  const initials = clean(body.initials, 12).toUpperCase();
  const consent = body.consent || {};
  const ip = clientIp(req);

  for (const item of consentItems) {
    if (consent[item.id] !== true) {
      return json(res, 400, { error: 'validation', field: item.id, message: 'All acknowledgements are required.' });
    }
  }
  if (normalName(signature) !== normalName(user.name)) {
    return json(res, 400, { error: 'validation', field: 'signature', message: 'Your signature must match your full name exactly.' });
  }
  if (!initials || initials.length < 2 || initials.length > 8) {
    return json(res, 400, { error: 'validation', field: 'initials', message: 'Add your initials (2–8 characters).' });
  }

  if (!user.nda) {
    const stamp = new Date().toISOString();
    const receipt = makeReceipt();
    user.nda = {
      version: NDA_VERSION,
      hash: agreementHash,
      documentHash: sha256(agreementText),
      signedName: signature,
      initials,
      signedAt: stamp,
      receipt,
      ip,
      ua: clean(req.headers['user-agent'], 240),
      consents: consentItems.map((item) => item.id),
    };
  }

  /* Advance every pending request that was waiting on the NDA. */
  let advanced = 0;
  for (const request of db().requests) {
    if (request.userId === user.id && request.status === 'nda_pending') {
      request.status = 'nda_signed';
      request.ndaSignedAt = user.nda.signedAt;
      request.receipt = user.nda.receipt;
      request.updatedAt = new Date().toISOString();
      advanced += 1;
    }
  }

  audit('nda.signed', { userId: user.id, receipt: user.nda.receipt, version: NDA_VERSION, ip });
  await flush();

  return json(res, 200, {
    ok: true,
    user: publicUser(user),
    advanced,
    next: safeNext(body.next, '/projects'),
  });
}

async function handleMyRequests(req, res) {
  const user = requireVerified(req, res);
  if (!user) return;
  const requests = db()
    .requests.filter((request) => request.userId === user.id)
    .map((request) => ({
      id: request.id,
      projectSlug: request.projectSlug,
      projectTitle: (getProject(request.projectSlug) || {}).title || request.projectSlug,
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      approvedAt: request.approvedAt || null,
      decisionNote: request.decisionNote || '',
    }))
    .reverse();
  return json(res, 200, { requests });
}

/* ------------------------------------------------------------------ */
/* Data room + documents                                               */
/* ------------------------------------------------------------------ */

function requireApproved(req, res, slug) {
  const user = currentUser(req);
  if (!user) {
    json(res, 401, { error: 'unauthorized' });
    return null;
  }
  if (!user.emailVerifiedAt) {
    json(res, 403, { error: 'unverified' });
    return null;
  }
  const request = findRequest(user.id, slug);
  if (!request || request.status !== 'approved') {
    json(res, 403, { error: 'not_approved', message: 'Access to this project has not been approved yet.' });
    return null;
  }
  return { user, request };
}

async function handleRoom(req, res, slug) {
  const gate = requireApproved(req, res, slug);
  if (!gate) return;
  const { user, request } = gate;
  const project = getProject(slug);
  if (!project) return json(res, 404, { error: 'not_found' });

  const progress = userDocProgress(user.id, slug);
  const progressMap = new Map(progress.map((doc) => [doc.slug, doc]));
  const docs = project.documents.map((doc) => {
    const stats = progressMap.get(doc.slug) || {};
    const index = doc.sections.map((section) => ({ id: section.id, title: section.title }));
    return {
      slug: doc.slug,
      title: doc.title,
      subtitle: doc.subtitle,
      category: doc.category,
      sensitivity: doc.sensitivity,
      version: doc.version,
      updated: doc.updated,
      pages: doc.pages,
      minutes: doc.minutes,
      summary: doc.summary,
      highlights: doc.highlights,
      sections: index,
      opened: Boolean(stats.opened),
      reviewed: Boolean(stats.reviewed),
      activeMinutes: Math.round((stats.activeMs || 0) / 60000),
      sectionsSeen: stats.sectionsSeen || 0,
      downloads: stats.downloads || 0,
      prints: stats.prints || 0,
      lastAt: stats.lastAt || null,
    };
  });

  return json(res, 200, {
    project: { slug: project.slug, title: project.title, tagline: project.tagline },
    request: { id: request.id, approvedAt: request.approvedAt, receipt: request.receipt || (user.nda && user.nda.receipt) },
    user: publicUser(user),
    totals: {
      documents: docs.length,
      pages: docs.reduce((sum, doc) => sum + doc.pages, 0),
      minutes: docs.reduce((sum, doc) => sum + doc.minutes, 0),
      opened: docs.filter((doc) => doc.opened).length,
      reviewed: docs.filter((doc) => doc.reviewed).length,
    },
    docs,
    questions: db()
      .questions.filter((question) => question.userId === user.id && question.projectSlug === slug)
      .reverse(),
  });
}

async function handleDocument(req, res, projectSlug, docSlug) {
  const gate = requireApproved(req, res, projectSlug);
  if (!gate) return;
  const { user, request } = gate;
  const project = getProject(projectSlug);
  const doc = getDocument(projectSlug, docSlug);
  if (!project || !doc) return json(res, 404, { error: 'not_found' });

  const progress = userDocStats(user.id, projectSlug, docSlug);
  trackServer(user.id, req, 'doc_open', { project: projectSlug, doc: docSlug, path: `/room/${projectSlug}/${docSlug}` });
  audit('doc.opened', { userId: user.id, project: projectSlug, doc: docSlug, ip: clientIp(req) });
  touch();

  return json(res, 200, {
    doc,
    project: { slug: project.slug, title: project.title },
    request: { id: request.id, receipt: request.receipt || (user.nda && user.nda.receipt) },
    progress,
    watermark: {
      name: user.name,
      email: user.email,
      receipt: user.nda?.receipt || '—',
      date: new Date().toISOString().slice(0, 10),
      hash: docSlug.slice(0, 4).toUpperCase() + '-' + sha256(user.id + docSlug).slice(0, 8).toUpperCase(),
    },
    library: project.documents.map((item) => ({ slug: item.slug, title: item.title, category: item.category })),
  });
}

async function handleDocAction(req, res, projectSlug, docSlug, action) {
  if (!requireSameOrigin(req, res)) return;
  const gate = requireApproved(req, res, projectSlug);
  if (!gate) return;
  const { user } = gate;
  const doc = getDocument(projectSlug, docSlug);
  if (!doc) return json(res, 404, { error: 'not_found' });

  const ip = clientIp(req);
  if (action === 'review') {
    trackServer(user.id, req, 'doc_review', { project: projectSlug, doc: docSlug, path: `/room/${projectSlug}/${docSlug}` });
    audit('doc.reviewed', { userId: user.id, project: projectSlug, doc: docSlug, ip });
    await flush();
    return json(res, 200, { ok: true });
  }
  if (action === 'print') {
    trackServer(user.id, req, 'print', { project: projectSlug, doc: docSlug, path: `/room/${projectSlug}/${docSlug}` });
    audit('doc.printed', { userId: user.id, project: projectSlug, doc: docSlug, ip });
    await flush();
    return json(res, 204);
  }
  return json(res, 400, { error: 'unknown_action' });
}

async function handleDocDownload(req, res, projectSlug, docSlug) {
  if (!requireSameOrigin(req, res)) return;
  const gate = requireApproved(req, res, projectSlug);
  if (!gate) return;
  const { user } = gate;
  const project = getProject(projectSlug);
  const doc = getDocument(projectSlug, docSlug);
  if (!project || !doc) return json(res, 404, { error: 'not_found' });

  trackServer(user.id, req, 'download', { project: projectSlug, doc: docSlug, path: `/room/${projectSlug}/${docSlug}`, meta: { format: 'watermarked-html' } });
  audit('doc.downloaded', { userId: user.id, project: projectSlug, doc: docSlug, ip: clientIp(req) });
  await flush();

  const body = downloadDocument(project, doc, user);
  const filename = `DealVault-${projectSlug}-${docSlug}-${new Date().toISOString().slice(0, 10)}.html`;
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    ...SECURITY_HEADERS,
  });
  res.end(body);
}

/* ------------------------------------------------------------------ */
/* Questions + tracking                                                */
/* ------------------------------------------------------------------ */

async function handleQuestion(req, res) {
  if (!requireSameOrigin(req, res)) return;
  const user = requireVerified(req, res);
  if (!user) return;
  const body = await readBody(req);
  const text = clean(body.question, 2000);
  if (text.length < 12) return json(res, 400, { error: 'too_short', message: 'Please add a little more detail.' });
  const projectSlug = clean(body.project, 60);
  const project = getProject(projectSlug);
  if (!project) return json(res, 400, { error: 'bad_project' });
  const docSlug = body.docSlug && getDocument(projectSlug, clean(body.docSlug, 80)) ? clean(body.docSlug, 80) : null;
  /* Only approved investors can open diligence threads on a project. */
  const request = findRequest(user.id, projectSlug);
  if (!request || request.status !== 'approved') {
    return json(res, 403, { error: 'not_approved', message: 'Questions open once access to the project is approved.' });
  }

  const question = {
    id: newId('q'),
    userId: user.id,
    userName: user.name,
    firm: user.firm,
    projectSlug,
    docSlug,
    body: text,
    status: 'open',
    createdAt: new Date().toISOString(),
    reply: null,
    repliedAt: null,
  };
  db().questions.push(question);
  audit('question.created', { userId: user.id, project: projectSlug, doc: question.docSlug, questionId: question.id });
  await flush();
  json(res, 201, { ok: true, question });
}

async function handleTrack(req, res) {
  const body = await readBody(req, 400_000);
  const events = Array.isArray(body.events) ? body.events.slice(0, 40) : [];
  const ip = clientIp(req);
  const limit = rateLimit(`track:${ip}`, 240, 60000);
  if (!limit.ok) return json(res, 429, { error: 'rate_limited' });
  const user = currentUser(req);
  const count = ingest(events, {
    userId: user ? user.id : null,
    sessionId: sessionHeader(req),
    ip,
  });
  if (user) {
    const stamp = new Date().toISOString();
    user.lastSeenAt = stamp;
  }
  if (count) touch();
  res.writeHead(204, { 'Cache-Control': 'no-store', ...SECURITY_HEADERS });
  res.end();
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

function requireAdmin(req, res) {
  if (isAdmin(req)) return true;
  json(res, 401, { error: 'admin_required' });
  return false;
}

async function handleAdminLogin(req, res) {
  if (!requireSameOrigin(req, res)) return;
  const ip = clientIp(req);
  const limit = rateLimit(`admin:${ip}`, 8, 900000);
  if (!limit.ok) return json(res, 429, { error: 'rate_limited', retryAfter: limit.retryAfter });
  const body = await readBody(req);
  if (!ADMIN_KEY) {
    return json(res, 503, {
      error: 'admin_disabled',
      message: 'The console is disabled. Set an ADMIN_KEY environment variable to enable it.',
    });
  }
  const token = adminLogin(clean(body.key, 200));
  if (!token) return json(res, 401, { error: 'invalid_key' });
  audit('admin.login', { ip });
  json(res, 200, { ok: true }, {
    'Set-Cookie': cookie('dv_admin', token, { maxAge: 12 * 3600, secure: isSecure(req) }),
  });
}

async function handleAdminLogout(req, res) {
  adminLogout(req);
  json(res, 200, { ok: true }, {
    'Set-Cookie': cookie('dv_admin', '', { maxAge: 0, secure: isSecure(req) }),
  });
}

function adminUserRow(user) {
  return {
    ...publicUser(user),
    suspended: user.status === 'suspended',
    requests: db()
      .requests.filter((request) => request.userId === user.id)
      .map((request) => ({ id: request.id, projectSlug: request.projectSlug, status: request.status, updatedAt: request.updatedAt })),
    auditCount: db().audit.filter((row) => row.userId === user.id).length,
    lastSeenAt: user.lastSeenAt || null,
  };
}

async function handleAdminDecision(req, res, requestId) {
  if (!requireAdmin(req, res)) return;
  if (!requireSameOrigin(req, res)) return;
  const request = db().requests.find((item) => item.id === requestId);
  if (!request) return json(res, 404, { error: 'not_found' });
  const body = await readBody(req);
  const decision = clean(body.decision, 20);

  if (!['approved', 'rejected', 'revoked'].includes(decision)) {
    return json(res, 400, { error: 'bad_decision' });
  }
  if (decision === 'approved' && request.status === 'approved') {
    return json(res, 409, { error: 'already_approved' });
  }

  request.status = decision;
  request.updatedAt = new Date().toISOString();
  request.decidedAt = new Date().toISOString();
  request.decisionNote = clean(body.note, 1200);
  if (decision === 'approved') {
    request.approvedAt = request.decidedAt;
    request.approvedBy = 'console';
  }

  /* Revoking or rejecting kills the investor's live sessions for safety. */
  if (decision !== 'approved') {
    destroyAllSessions(request.userId);
  }

  audit(`request.${decision === 'approved' ? 'approved' : decision === 'rejected' ? 'rejected' : 'revoked'}`, {
    requestId,
    userId: request.userId,
    project: request.projectSlug,
    note: request.decisionNote,
    ip: clientIp(req),
  });
  await flush();
  json(res, 200, { ok: true, request });
}

async function handleAdminUserPatch(req, res, userId) {
  if (!requireAdmin(req, res)) return;
  if (!requireSameOrigin(req, res)) return;
  const user = db().users.find((item) => item.id === userId);
  if (!user) return json(res, 404, { error: 'not_found' });
  const body = await readBody(req);
  if (body.status && ['active', 'suspended'].includes(body.status)) {
    user.status = body.status;
    if (body.status === 'suspended') destroyAllSessions(user.id);
  }
  if (typeof body.note === 'string') user.adminNote = clean(body.note, 1200);
  audit('admin.user_updated', { userId: user.id, status: user.status, ip: clientIp(req) });
  await flush();
  json(res, 200, { ok: true, user: adminUserRow(user) });
}

/* ------------------------------------------------------------------ */
/* Project import (PRD v2.1 §7.8) — CSV/XLSX, dry-run first            */
/* ------------------------------------------------------------------ */

async function handleImportTemplate(req, res) {
  if (!requireAdmin(req, res)) return;
  const body = templateCsv();
  res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="dealvault-project-import-template.csv"',
    'Cache-Control': 'no-store',
    ...SECURITY_HEADERS,
  });
  res.end(body);
}

async function handleAdminImport(req, res, url) {
  if (!requireAdmin(req, res)) return;
  const ip = clientIp(req);
  const limit = rateLimit(`import:${ip}`, 12, 3600000);
  if (!limit.ok) return json(res, 429, { error: 'rate_limited', retryAfter: limit.retryAfter });

  const mode = url.searchParams.get('mode') === 'commit' ? 'commit' : 'dry_run';
  const fileName = clean(req.headers['x-file-name'] || 'upload', 120);
  const buffer = await readRaw(req);

  if (!buffer.length) return json(res, 400, { error: 'empty_file', message: 'The uploaded file is empty.' });
  if (buffer.length > IMPORT_MAX_BYTES) {
    return json(res, 413, { error: 'too_large', message: 'Files are limited to 2 MB.' });
  }

  const store = db();
  const knownSlugs = new Set(projectIndex().filter((p) => p.source === 'builtin').map((p) => p.slug));
  const storedSlugs = new Set((store.projects || []).map((p) => p.slug));

  const plan = buildImport(buffer, fileName, knownSlugs, storedSlugs);
  const summary = {
    mode,
    file: plan.file,
    fileErrors: plan.fileErrors,
    issues: plan.issues,
    counts: plan.counts,
  };

  if (mode === 'dry_run') {
    audit('import.dry_run', {
      file: plan.file.name,
      fileType: plan.file.type,
      rows: plan.counts.total || 0,
      errors: plan.counts.errors || 0,
      warnings: plan.counts.warnings || 0,
      wouldCreate: plan.counts.wouldCreate || 0,
      wouldUpdate: plan.counts.wouldUpdate || 0,
      ok: plan.ok,
      ip,
    });
    await flush();
    return json(res, 200, { ...summary, ok: plan.ok, committed: false });
  }

  /* Commit mode */
  if (!plan.ok) {
    audit('import.commit_rejected', {
      file: plan.file.name,
      errors: plan.counts.errors || 0,
      fileErrors: plan.fileErrors.length,
      ip,
    });
    await flush();
    return json(res, 422, {
      ...summary,
      ok: false,
      committed: false,
      message: 'The import was rejected. Fix the errors, or run validate-only first to see them.',
    });
  }

  if ((store.projects || []).length + plan.counts.wouldCreate > IMPORT_MAX_PROJECTS) {
    return json(res, 409, {
      error: 'limit',
      message: `Importing this file would exceed the ${IMPORT_MAX_PROJECTS}-project limit for the store.`,
    });
  }

  const batchId = newId('imp');
  const outcome = applyImport(plan, batchId);
  audit('import.commit', {
    file: plan.file.name,
    fileType: plan.file.type,
    batchId,
    rows: plan.counts.total,
    created: outcome.created.length,
    updated: outcome.updated.length,
    warnings: plan.counts.warnings,
    slugs: [...outcome.created, ...outcome.updated],
    ip,
  });
  await flush();
  console.log(`[import] ${plan.file.name} → ${outcome.created.length} created, ${outcome.updated.length} updated (${batchId})`);

  return json(res, 200, {
    ...summary,
    ok: true,
    committed: true,
    batchId,
    created: outcome.created,
    updated: outcome.updated,
    message: `Imported ${outcome.created.length} new project${outcome.created.length === 1 ? '' : 's'}${
      outcome.updated.length ? ` and updated ${outcome.updated.length}` : ''
    }.`,
  });
}

/* ------------------------------------------------------------------ */
/* Static + routing                                                    */
/* ------------------------------------------------------------------ */

async function serveStatic(req, res, pathname) {
  let relative = decodeURIComponent(pathname).replace(/^\/+/, '');
  if (!relative) relative = 'index.html';
  const resolved = path.resolve(PUBLIC_DIR, relative);
  if (!resolved.startsWith(path.resolve(PUBLIC_DIR))) {
    return html(res, 403, '<h1>Forbidden</h1>');
  }
  try {
    const stat = await fsp.stat(resolved);
    if (stat.isDirectory()) return html(res, 404, notFoundPage());
    const ext = path.extname(resolved).toLowerCase();
    const body = await fsp.readFile(resolved);
    const cache =
      ext === '.html' || (!IS_SERVERLESS && DEV_MODE) ? 'no-store' : 'public, max-age=3600';
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': cache,
      ...SECURITY_HEADERS,
    });
    res.end(body);
  } catch {
    html(res, 404, notFoundPage());
  }
}

function notFoundPage() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Not found — ${escapeHtml(PLATFORM_NAME)}</title>
  <meta name="viewport" content="width=device-width,initial-scale=1"><style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f4ed;color:#1c1a15;font-family:"Poppins","Segoe UI",sans-serif;text-align:center}
  main{padding:2rem}
  p.k{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#6f695e;margin:0 0 .8rem}
  h1{font-size:28px;letter-spacing:-.03em;margin:0 0 .6rem;color:#214534}
  p{color:#6f695e;font-size:14px;margin:0 0 1.4rem}
  a{color:#214534;font-size:12px;letter-spacing:.14em;text-transform:uppercase;text-decoration:none;border-bottom:1px solid #c6bca6;padding-bottom:.15rem}
  </style></head><body><main>
  <p class="k">404</p>
  <h1>This page is not in the vault.</h1>
  <p>The address may have changed, or the page was never here.</p>
  <a href="/">Return to ${escapeHtml(PLATFORM_NAME)}</a>
  </main></body></html>`;
}

export async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method || 'GET';

  try {
    if (pathname.startsWith('/api/')) {
      if (method === 'POST' && !requireSameOrigin(req, res)) return;

      if (pathname === '/api/health') {
        return json(res, 200, {
          ok: true,
          service: 'dealvault',
          platform: PLATFORM_NAME,
          uptime: Math.round((Date.now() - started) / 1000),
          dev: DEV_MODE,
          storage: REMOTE ? 'remote' : 'file',
          catalogue: catalogue(),
        });
      }

      if (pathname === '/api/agreement') {
        return json(res, 200, { agreement, consentItems, hash: agreementHash, contact: CONTACT_EMAIL });
      }

      if (pathname === '/api/me') {
        const user = currentUser(req);
        return json(res, 200, { user: publicUser(user), admin: isAdmin(req), dev: DEV_MODE });
      }

      /* ---- auth ---- */
      if (pathname === '/api/auth/register' && method === 'POST') return handleRegister(req, res);
      if (pathname === '/api/auth/verify' && method === 'POST') return handleVerify(req, res);
      if (pathname === '/api/auth/verify/resend' && method === 'POST') return handleResendCode(req, res);
      if (pathname === '/api/auth/login' && method === 'POST') return handleLogin(req, res);
      if (pathname === '/api/auth/logout' && method === 'POST') return handleLogout(req, res);
      if (pathname === '/api/account/lock' && method === 'POST') return handleLockAccount(req, res);
      if (pathname === '/api/auth/reset/request' && method === 'POST') return handleResetRequest(req, res);
      if (pathname === '/api/auth/reset/confirm' && method === 'POST') return handleResetConfirm(req, res);

      /* ---- projects + requests + NDA ---- */
      if (pathname === '/api/projects' && method === 'GET') return handleProjectList(req, res, url);
      if (pathname === '/api/requests' && method === 'GET') return handleMyRequests(req, res);
      if (pathname === '/api/nda/sign' && method === 'POST') return handleNdaSign(req, res);
      if (pathname === '/api/questions' && method === 'POST') return handleQuestion(req, res);
      if (pathname === '/api/track' && method === 'POST') return handleTrack(req, res);

      const interestMatch = pathname.match(/^\/api\/projects\/([a-z0-9-]+)\/interest$/);
      if (interestMatch && method === 'POST') return handleExpressInterest(req, res, interestMatch[1]);
      const projectMatch = pathname.match(/^\/api\/projects\/([a-z0-9-]+)$/);
      if (projectMatch && method === 'GET') return handleProjectDetail(req, res, projectMatch[1]);

      /* ---- data room ---- */
      const roomMatch = pathname.match(/^\/api\/room\/([a-z0-9-]+)$/);
      if (roomMatch && method === 'GET') return handleRoom(req, res, roomMatch[1]);
      const docMatch = pathname.match(/^\/api\/documents\/([a-z0-9-]+)\/([a-z0-9-]+)$/);
      if (docMatch && method === 'GET') return handleDocument(req, res, docMatch[1], docMatch[2]);
      const reviewMatch = pathname.match(/^\/api\/documents\/([a-z0-9-]+)\/([a-z0-9-]+)\/review$/);
      if (reviewMatch && method === 'POST') return handleDocAction(req, res, reviewMatch[1], reviewMatch[2], 'review');
      const printMatch = pathname.match(/^\/api\/documents\/([a-z0-9-]+)\/([a-z0-9-]+)\/print$/);
      if (printMatch && method === 'POST') return handleDocAction(req, res, printMatch[1], printMatch[2], 'print');
      const downloadMatch = pathname.match(/^\/api\/documents\/([a-z0-9-]+)\/([a-z0-9-]+)\/download$/);
      if (downloadMatch && method === 'POST') return handleDocDownload(req, res, downloadMatch[1], downloadMatch[2]);

      /* ---- admin ---- */
      if (pathname === '/api/admin/login' && method === 'POST') return handleAdminLogin(req, res);
      if (pathname === '/api/admin/logout' && method === 'POST') return handleAdminLogout(req, res);
      if (pathname === '/api/admin/overview') {
        if (!requireAdmin(req, res)) return;
        return json(res, 200, {
          users: userStats(),
          requests: requestFunnel(),
          catalogue: catalogue(),
          projectInterest: projectInterest(),
          recent: recentAudit(40).map((row) => ({ ...row, label: describeAudit(row) })),
        });
      }
      if (pathname === '/api/admin/requests') {
        if (!requireAdmin(req, res)) return;
        const requests = db()
          .requests.slice()
          .reverse()
          .map((request) => ({
            ...request,
            user: publicUser(findUserLite(request.userId)),
            projectTitle: (getProject(request.projectSlug) || {}).title || request.projectSlug,
          }));
        return json(res, 200, { requests });
      }
      const decisionMatch = pathname.match(/^\/api\/admin\/requests\/([a-zA-Z0-9_]+)\/decision$/);
      if (decisionMatch && method === 'POST') return handleAdminDecision(req, res, decisionMatch[1]);
      if (pathname === '/api/admin/users') {
        if (!requireAdmin(req, res)) return;
        return json(res, 200, { users: db().users.map(adminUserRow) });
      }
      const userMatch = pathname.match(/^\/api\/admin\/users\/([a-zA-Z0-9_]+)$/);
      if (userMatch && method === 'GET') {
        if (!requireAdmin(req, res)) return;
        const user = db().users.find((item) => item.id === userMatch[1]);
        if (!user) return json(res, 404, { error: 'not_found' });
        const userAudit = db()
          .audit.filter((row) => row.userId === user.id)
          .slice(-100)
          .reverse()
          .map((row) => ({ ...row, label: describeAudit(row) }));
        return json(res, 200, { user: adminUserRow(user), audit: userAudit });
      }
      if (userMatch && method === 'PATCH') return handleAdminUserPatch(req, res, userMatch[1]);
      if (pathname === '/api/admin/audit') {
        if (!requireAdmin(req, res)) return;
        const limit = Math.min(Number(url.searchParams.get('limit')) || 120, 400);
        const filter = {
          action: clean(url.searchParams.get('action'), 40),
          userId: clean(url.searchParams.get('userId'), 60),
          project: clean(url.searchParams.get('project'), 60),
        };
        const rows = recentAudit(limit, filter).map((row) => ({
          ...row,
          user: row.userId ? publicUser(findUserLite(row.userId)) : null,
          label: describeAudit(row),
        }));
        return json(res, 200, { rows });
      }
      if (pathname === '/api/admin/projects') {
        if (!requireAdmin(req, res)) return;
        const interest = projectInterest();
        return json(res, 200, {
          projects: projectIndex().map((project) => ({
            slug: project.slug,
            title: project.title,
            sector: project.sector,
            stage: project.stage,
            geography: project.geography,
            ticket: project.ticket,
            status: project.status,
            visibility: project.visibility || 'registered',
            source: project.source || 'builtin',
            updated: project.updated,
            documents: project.documents.length,
            pages: project.documents.reduce((sum, doc) => sum + doc.pages, 0),
            interest: interest[project.slug] || 0,
          })),
        });
      }
      if (pathname === '/api/admin/import/projects' && method === 'POST') {
        return handleAdminImport(req, res, url);
      }
      if (pathname === '/api/admin/import/template.csv' && method === 'GET') {
        return handleImportTemplate(req, res);
      }

      return json(res, 404, { error: 'not_found' });
    }

    if (method !== 'GET' && method !== 'HEAD') {
      return html(res, 405, '<h1>Method not allowed</h1>');
    }

    /* ---------------- page gating (server-side) ---------------- */

    /* Registered, verified surfaces */
    if (pathname === '/projects' || pathname.startsWith('/projects/') || pathname === '/nda') {
      const user = currentUser(req);
      if (!user) return redirect(res, `/login?next=${encodeURIComponent(pathname + url.search)}`);
      if (!user.emailVerifiedAt) return redirect(res, `/verify?email=${encodeURIComponent(user.email)}`);
    }

    /* Approved-only surfaces */
    const roomMatch = pathname.match(/^\/room\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?\/?$/);
    if (roomMatch) {
      const user = currentUser(req);
      if (!user) return redirect(res, `/login?next=${encodeURIComponent(pathname)}`);
      if (!user.emailVerifiedAt) return redirect(res, `/verify?email=${encodeURIComponent(user.email)}`);
      const request = findRequest(user.id, roomMatch[1]);
      if (!request || request.status !== 'approved') {
        return redirect(res, `/projects/${roomMatch[1]}`);
      }
      if (roomMatch[2] && !getDocument(roomMatch[1], roomMatch[2])) {
        return html(res, 404, notFoundPage());
      }
    }

    if (pathname === '/account' || pathname === '/account/') {
      const user = currentUser(req);
      if (!user) return redirect(res, `/login?next=${encodeURIComponent('/account')}`);
    }

    /* Auth pages bounce to the showcase when already signed in and verified */
    if (['/register', '/login', '/forgot'].includes(pathname)) {
      const user = currentUser(req);
      if (user && user.emailVerifiedAt && pathname !== '/forgot') {
        return redirect(res, safeNext(url.searchParams.get('next')));
      }
    }

    /* Dynamic page shells */
    if (roomMatch) return serveStatic(req, res, roomMatch[2] ? 'doc.html' : 'room.html');
    const projectPageMatch = pathname.match(/^\/projects\/([a-z0-9-]+)\/?$/);
    if (projectPageMatch) {
      const pageProject = getProject(projectPageMatch[1]);
      if (!pageProject || HIDDEN_STATUSES.has(pageProject.status)) return html(res, 404, notFoundPage());
      return serveStatic(req, res, 'project.html');
    }

    if (PAGE_ROUTES[pathname]) {
      return serveStatic(req, res, PAGE_ROUTES[pathname]);
    }

    if (pathname === '/favicon.ico') {
      return redirect(res, '/assets/img/favicon.svg');
    }

    if (pathname.startsWith('/assets/')) {
      return serveStatic(req, res, pathname);
    }

    if (pathname === '/admin/' || pathname === '/projects/' || pathname === '/room/') {
      return redirect(res, pathname.slice(0, -1));
    }

    return html(res, 404, notFoundPage());
  } catch (error) {
    console.error('[server]', error);
    if (res.headersSent) return res.end();
    return json(res, error.status || 500, {
      error: 'server_error',
      message: DEV_MODE ? error.message : 'Something went wrong.',
    });
  }
}

function findUserLite(userId) {
  return db().users.find((user) => user.id === userId) || null;
}

/* Boot once per process (or per serverless instance). */
let readyPromise = null;

export function ensureReady() {
  if (!readyPromise) {
    readyPromise = init().catch((error) => {
      readyPromise = null;
      throw error;
    });
  }
  return readyPromise;
}
