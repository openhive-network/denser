// The apps' hb-auth worker entry (copy:public puts it next to hb-auth's worker.js). A SharedWorker
// runs while any page that connected to it is open, and hb-auth's worker has no way to end it, so a
// worker a page replaced kept its beekeeper WASM until the page closed. Once a page retires this one,
// it ends when no page holds it any more (src/hb-auth/worker-release.ts): each page holds a shared
// Web Lock named after the worker while it uses it, which the browser drops with the page.
import './worker.js';

const RETIRE_WORKER_MESSAGE = 'denser:retire-worker';
const WORKER_LOCK_PREFIX = 'denser:hb-auth-worker:';

let retiring = false;

self.addEventListener('connect', (event) => {
  const port = event.ports[0];
  port.addEventListener('message', ({ data }) => {
    if (data?.type !== RETIRE_WORKER_MESSAGE || retiring || !self.navigator.locks) return;
    retiring = true;
    self.navigator.locks.request(`${WORKER_LOCK_PREFIX}${self.location.href}`, { mode: 'exclusive' }, () => self.close());
  });
  port.start();
});
