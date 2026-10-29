import crypto from 'node:crypto';
import {
  ADMIN_KEY,
  ADMIN_SESSION_HOURS,
  CODE_MAX_ATTEMPTS,
  CODE_TTL_MINUTES,
  SESSION_DAYS,
} from './config.js';
import { db, findUserByEmail, touch, uid } from './store.js';

export const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
export const now = () => Date.now();

/* ------------------------------ passwords ------------------------------ */

const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1 };

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN, SCRYPT_OPTS).toString('hex');
  return { salt, hash, algo: `scrypt:${SCRYPT_OPTS.N}:${SCRYPT_OPTS.r}:${SCRYPT_OPTS.p}` };
}

export function verifyPassword(password, record) {
  if (!record || !record.salt || !record.hash) return false;
  const candidate = crypto.scryptSync(String(password), record.salt, SCRYPT_KEYLEN, SCRYPT_OPTS);
  const stored = Buffer.from(record.hash, 'hex');
  if (candidate.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidate, stored);
}

export function passwordStrength(password) {
  const value = String(password || '');
  if (value.length < 10) return 'Use at least 10 characters.';
  if (value.length > 200) return 'That password is too long.';
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value)) return 'Mix upper and lower case letters.';
  if (!/[0-9]/.test(value)) return 'Add at least one number.';
  return '';
}

export function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

/* ------------------------------- cookies ------------------------------- */

export function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

export function cookie(name, value, options = {}) {
  const bits = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (options.maxAge !== undefined) bits.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.secure) bits.push('Secure');
  return bits.join('; ');
}

export function isSecure(req) {
  return Boolean(req.socket.encrypted) || req.headers['x-forwarded-proto'] === 'https';
}

/* -------------------------- investor sessions -------------------------- */

export function createSession(user, req) {
  const token = randomToken(32);
  const key = sha256(token);
  const expiresAt = now() + SESSION_DAYS * 86400000;
  db().sessions[key] = {
    userId: user.id,
    createdAt: new Date().toISOString(),
    expiresAt,
    ip: clientIp(req),
    ua: String(req.headers['user-agent'] || '').slice(0, 240),
    lastSeenAt: new Date().toISOString(),
  };
  user.lastSeenAt = new Date().toISOString();
  pruneSessions();
  touch();
  return { token, expiresAt };
}

export function currentSession(req) {
  const token = parseCookies(req).dv_sid;
  if (!token) return null;
  const key = sha256(token);
  const session = db().sessions[key];
  if (!session) return null;
  if (session.expiresAt < now()) {
    delete db().sessions[key];
    touch();
    return null;
  }
  return { key, session };
}

export function currentUser(req) {
  const found = currentSession(req);
  if (!found) return null;
  const user = db().users.find((item) => item.id === found.session.userId);
  if (!user || user.status === 'suspended') return null;
  found.session.lastSeenAt = new Date().toISOString();
  user.lastSeenAt = new Date().toISOString();
  return user;
}

export function destroySession(req) {
  const found = currentSession(req);
  if (found) {
    delete db().sessions[found.key];
    touch();
  }
}

export function destroyAllSessions(userId) {
  for (const [key, session] of Object.entries(db().sessions)) {
    if (session.userId === userId) delete db().sessions[key];
  }
  touch();
}

export function pruneSessions() {
  const stamp = now();
  for (const [key, session] of Object.entries(db().sessions)) {
    if (session.expiresAt < stamp) delete db().sessions[key];
  }
  for (const [key, session] of Object.entries(db().adminSessions)) {
    if (session.expiresAt < stamp) delete db().adminSessions[key];
  }
  for (const [key, code] of Object.entries(db().codes)) {
    if (code.expiresAt < stamp - 3600000) delete db().codes[key];
  }
}

/* ------------------- verification / reset codes (OTP) ------------------- */
/*
 * One mechanism, two purposes: email verification at registration and
 * password reset. Codes are stored salted + hashed, expire in 15 minutes,
 * allow six attempts, and are consumed on success.
 */

export function issueCode(purpose, email, req) {
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const salt = randomToken(12);
  db().codes[`${purpose}:${email}`] = {
    purpose,
    salt,
    hash: sha256(`${salt}:${code}`),
    expiresAt: now() + CODE_TTL_MINUTES * 60000,
    attempts: 0,
    sentAt: now(),
    ip: clientIp(req),
  };
  touch();
  return code;
}

export function verifyCode(purpose, email, code) {
  const key = `${purpose}:${String(email).toLowerCase()}`;
  const record = db().codes[key];
  if (!record) return { ok: false, reason: 'no_code' };
  if (record.expiresAt < now()) {
    delete db().codes[key];
    touch();
    return { ok: false, reason: 'expired' };
  }
  if (record.attempts >= CODE_MAX_ATTEMPTS) return { ok: false, reason: 'locked' };
  record.attempts += 1;
  const candidate = sha256(`${record.salt}:${String(code).trim()}`);
  if (!safeEqual(candidate, record.hash)) {
    touch();
    return { ok: false, reason: 'invalid' };
  }
  delete db().codes[key];
  touch();
  return { ok: true };
}

export function codeCooldown(purpose, email) {
  const record = db().codes[`${purpose}:${String(email).toLowerCase()}`];
  if (!record) return 0;
  const remaining = 45000 - (now() - record.sentAt);
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/* ------------------------------- admin -------------------------------- */

export function adminLogin(key) {
  if (!ADMIN_KEY) return null;
  if (!safeEqual(sha256(key), sha256(ADMIN_KEY))) return null;
  const token = randomToken(32);
  db().adminSessions[sha256(token)] = {
    createdAt: new Date().toISOString(),
    expiresAt: now() + ADMIN_SESSION_HOURS * 3600000,
  };
  touch();
  return token;
}

export function isAdmin(req) {
  const token = parseCookies(req).dv_admin;
  if (!token) return false;
  const session = db().adminSessions[sha256(token)];
  if (!session || session.expiresAt < now()) return false;
  return true;
}

export function adminLogout(req) {
  const token = parseCookies(req).dv_admin;
  if (token) {
    delete db().adminSessions[sha256(token)];
    touch();
  }
}

export function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket.remoteAddress || 'unknown';
}

export function makeReceipt() {
  const stamp = new Date();
  const part = stamp.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `DV-${part}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export function newId(prefix) {
  return uid(prefix);
}
