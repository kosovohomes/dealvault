import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ON_VERCEL = Boolean(process.env.VERCEL);

/*
 * Resolve the project root. The bundler may place this module at the lambda
 * root, inside api/, or keep it under server/, so test the candidates instead
 * of trusting import.meta.url alone.
 */
function pickRoot() {
  const candidates = [
    path.resolve(here, '..'),
    process.cwd(),
    path.resolve(here, '../..'),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(path.join(candidate, 'public', 'index.html'))) return candidate;
    } catch {
      /* keep looking */
    }
  }
  return path.resolve(here, '..');
}

export const ROOT = pickRoot();
export const PUBLIC_DIR = path.join(ROOT, 'public');

/* Seed shipped with the code. Read-only; used to populate a fresh store. */
export const SEED_FILE = path.join(ROOT, 'data', 'store.json');

export const IS_SERVERLESS = ON_VERCEL;

/*
 * On Vercel the bundle is read-only, so writes go to /tmp. Set DATA_DIR to
 * override (useful for a mounted volume or a local test).
 */
export const DATA_DIR =
  process.env.DATA_DIR || (ON_VERCEL ? path.join(os.tmpdir(), 'dealvault-data') : path.join(ROOT, 'data'));

export const PORT = Number(process.env.PORT || 4173);
export const HOST = process.env.HOST || '127.0.0.1';

export const PLATFORM_NAME = process.env.PLATFORM_NAME || 'DealVault';
export const COMPANY_LEGAL = process.env.COMPANY_LEGAL || 'DealVault Operations';
export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'deals@dealvault.app';

/*
 * Demo mode shows verification and password-reset codes in the browser
 * instead of emailing them. There is no email provider wired in, so this
 * stays on by default. Set DEMO_MODE=false only after adding real delivery.
 */
export const DEV_MODE =
  process.env.DEMO_MODE !== undefined
    ? process.env.DEMO_MODE !== 'false'
    : ON_VERCEL || process.env.NODE_ENV !== 'production';

/* Empty key disables the admin console. Locally it falls back to a known dev key. */
export const ADMIN_KEY = process.env.ADMIN_KEY ?? (ON_VERCEL ? '' : 'dealvault-admin-2026');

export const SESSION_DAYS = 7;
export const ADMIN_SESSION_HOURS = 12;
export const CODE_TTL_MINUTES = 15;
export const CODE_MAX_ATTEMPTS = 6;
export const NDA_VERSION = 'DV-CONF-2026.1';

/* How many reading events to keep before the oldest are dropped. */
export const TRACKING_RETENTION = 60000;
