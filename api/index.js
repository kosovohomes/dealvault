/*
 * Vercel serverless entry point.
 *
 * Every request is routed here by vercel.json so gating, CSP and the audit
 * trail keep working exactly as they do locally. The store is flushed before
 * the response is released, because the instance can be frozen right after.
 */
import { handleRequest, ensureReady } from '../server/app.js';
import { flush } from '../server/store.js';

/*
 * @vercel/node may pre-parse the JSON body and consume the stream. Re-expose
 * it as an async iterable so the app's own readBody() sees the same bytes.
 */
function withBody(req) {
  if (req.body === undefined) return req;

  let raw = '';
  try {
    raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  } catch {
    raw = '';
  }

  return new Proxy(req, {
    get(target, prop) {
      if (prop === Symbol.asyncIterator) {
        return async function* replay() {
          if (raw) yield Buffer.from(raw, 'utf8');
        };
      }
      const value = target[prop];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

export default async function handler(req, res) {
  await ensureReady();

  let flushPromise = null;
  const end = res.end.bind(res);

  res.end = function patchedEnd(...args) {
    if (!flushPromise) {
      flushPromise = flush().catch((error) => {
        console.error('[api] flush failed:', error.message);
      });
    }
    flushPromise.then(
      () => end(...args),
      () => end(...args),
    );
    return res;
  };

  await handleRequest(withBody(req), res);

  if (flushPromise) await flushPromise;
}
