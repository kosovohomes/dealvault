/*
 * Local launcher. On Vercel the app is served by api/index.js instead.
 */
import http from 'node:http';

import { handleRequest, ensureReady } from './app.js';
import { ADMIN_KEY, CONTACT_EMAIL, DEV_MODE, HOST, PORT, PLATFORM_NAME } from './config.js';
import { flush } from './store.js';

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error('[server] unhandled', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    res.end('Something went wrong.');
  });
});

await ensureReady();

server.listen(PORT, HOST, () => {
  console.log('');
  console.log(`  ${PLATFORM_NAME} — gated multi-project deal room`);
  console.log(`  http://${HOST}:${PORT}`);
  console.log(`  Admin console:  http://${HOST}:${PORT}/admin`);
  console.log(
    ADMIN_KEY
      ? `  Admin key: ${ADMIN_KEY}${process.env.ADMIN_KEY ? '' : ' (default — set ADMIN_KEY before deploying)'}`
      : '  Admin key: not set — console disabled. Set ADMIN_KEY to enable it.',
  );
  console.log(`  Mode: ${DEV_MODE ? 'development (verification codes shown on screen)' : 'production'}`);
  console.log(`  Contact: ${CONTACT_EMAIL}`);
  console.log('');
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[server] ${signal} — flushing data`);
  server.close();
  await flush();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
