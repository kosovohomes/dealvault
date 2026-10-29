/*
 * Delete the local store after an explicit confirmation prompt.
 * On Vercel the store lives in Redis — clear the KV key instead.
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const DATA_FILE = path.join(ROOT, 'data', 'store.json');

if (process.argv.includes('--yes')) {
  fs.rmSync(DATA_FILE, { force: true });
  console.log('[reset] store deleted. Run "npm run demo" to reseed.');
  process.exit(0);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const answer = await rl.question('Delete data/store.json? This removes all accounts and records (y/N) ');
rl.close();
if (answer.trim().toLowerCase() === 'y') {
  fs.rmSync(DATA_FILE, { force: true });
  console.log('[reset] store deleted. Run "npm run demo" to reseed.');
} else {
  console.log('[reset] cancelled.');
}
