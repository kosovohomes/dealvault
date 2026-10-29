import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DATA_DIR, SEED_FILE, TRACKING_RETENTION } from './config.js';

/*
 * Single-document store.
 *
 * Backend is chosen at boot:
 *   1. Upstash Redis / Vercel KV over REST, when REST url + token are present.
 *      Works on serverless, survives redeploys, shared by every instance.
 *   2. Otherwise a JSON file on disk (local dev, or /tmp on Vercel as a
 *      last-resort fallback that is lost when the instance recycles).
 *
 * Suitable for a low-traffic deal platform. Writes replace the whole
 * document, so extremely concurrent edits could overwrite each other.
 */

const REST_URL = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').replace(/\/+$/, '');
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
export const REMOTE = Boolean(REST_URL && REST_TOKEN);

const STORE_KEY = process.env.STORE_KEY || 'dealvault:store:v1';

const FILE = path.join(DATA_DIR, 'store.json');
const TMP = `${FILE}.tmp`;

const blank = () => ({
  version: 1,
  meta: {
    createdAt: new Date().toISOString(),
    seeded: false,
    lastWritten: null,
  },
  users: [],
  projects: [], /* imported via the console (PRD v2.1 §7.8); built-ins live in content.js */
  requests: [],
  sessions: {},
  adminSessions: {},
  codes: {},
  events: [],
  questions: [],
  audit: [],
});

let state = blank();
let writeTimer = null;
let dirty = false;
let chain = Promise.resolve();

function hydrate(parsed) {
  const base = blank();
  const next = { ...base, ...(parsed || {}) };
  for (const key of Object.keys(base)) {
    if (next[key] === undefined || next[key] === null) next[key] = base[key];
  }
  for (const key of ['users', 'projects', 'requests', 'events', 'questions', 'audit']) {
    if (!Array.isArray(next[key])) next[key] = [];
  }
  for (const key of ['sessions', 'adminSessions', 'codes']) {
    if (typeof next[key] !== 'object' || Array.isArray(next[key])) next[key] = {};
  }
  return next;
}

function readSeed() {
  try {
    const raw = fs.readFileSync(SEED_FILE, 'utf8');
    return hydrate(JSON.parse(raw));
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn('[store] seed unreadable:', error.message);
    return null;
  }
}

/* ------------------------------ remote ------------------------------ */

async function remoteGet() {
  const response = await fetch(`${REST_URL}/get/${STORE_KEY}`, {
    headers: { Authorization: `Bearer ${REST_TOKEN}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`KV GET ${response.status}`);
  const payload = await response.json();
  return typeof payload.result === 'string' ? payload.result : null;
}

async function remoteSet(value) {
  const response = await fetch(`${REST_URL}/set/${STORE_KEY}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REST_TOKEN}` },
    body: value,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`KV SET ${response.status}`);
}

/* ------------------------------- init ------------------------------- */

export async function init() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (error) {
    console.warn('[store] cannot create data dir:', error.message);
  }

  if (REMOTE) {
    try {
      const raw = await remoteGet();
      if (raw) {
        state = hydrate(JSON.parse(raw));
        if (state.meta.seeded) return;
      }
    } catch (error) {
      console.warn('[store] remote read failed:', error.message);
    }
    const seed = readSeed();
    state = seed || blank();
    state.meta.seeded = true;
    dirty = true;
    await flush();
    console.log(`[store] initialised remote store (${STORE_KEY})`);
    return;
  }

  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    state = hydrate(JSON.parse(raw));
    return;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      const backup = `${FILE}.corrupt-${Date.now()}`;
      try {
        fs.copyFileSync(FILE, backup);
      } catch {
        /* ignore */
      }
      console.warn(`[store] could not read store, starting fresh. Backup: ${backup}`);
    }
  }

  const seed = readSeed();
  state = seed || blank();
  dirty = true;
  await flush();
}

export function db() {
  return state;
}

export function touch() {
  dirty = true;
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    writeTimer = null;
    flush().catch((error) => console.error('[store] write failed', error));
  }, 350);
}

async function write(payload) {
  if (REMOTE) return remoteSet(payload);
  await fs.promises.writeFile(TMP, payload, 'utf8');
  await fs.promises.rename(TMP, FILE);
}

export async function flush() {
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  if (!dirty) return;
  dirty = false;

  if (state.events.length > TRACKING_RETENTION) {
    state.events = state.events.slice(-TRACKING_RETENTION);
  }
  state.meta.lastWritten = new Date().toISOString();
  const payload = JSON.stringify(state);

  chain = chain.then(() => write(payload)).catch((error) => {
    dirty = true;
    console.error('[store] write failed:', error.message);
  });
  await chain;
}

export function uid(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(9).toString('hex')}`;
}

/*
 * Append-only audit trail. Every significant action lands here — account
 * lifecycle, requests, NDA signatures, document access, admin decisions.
 * The array is capped for storage safety; export it before that matters.
 */
export function audit(action, detail = {}) {
  state.audit.push({ id: uid('aud'), at: new Date().toISOString(), action, ...detail });
  if (state.audit.length > 8000) state.audit = state.audit.slice(-8000);
  touch();
}

export function findUserByEmail(email) {
  const needle = String(email || '').trim().toLowerCase();
  return state.users.find((user) => user.email.toLowerCase() === needle) || null;
}

export function findUser(id) {
  return state.users.find((user) => user.id === id) || null;
}

export function findRequest(userId, projectSlug) {
  return (
    state.requests.find(
      (request) => request.userId === userId && request.projectSlug === projectSlug,
    ) || null
  );
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    firm: user.firm,
    role: user.role || 'investor',
    country: user.country,
    status: user.status,
    emailVerified: Boolean(user.emailVerifiedAt),
    createdAt: user.createdAt,
    lastSeenAt: user.lastSeenAt || null,
    qualification: user.qualification || null,
    nda: user.nda
      ? {
          version: user.nda.version,
          signedName: user.nda.signedName,
          signedAt: user.nda.signedAt,
          receipt: user.nda.receipt,
          hash: user.nda.hash,
        }
      : null,
  };
}

export async function shutdown() {
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  await flush();
}
