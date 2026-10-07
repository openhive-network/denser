#!/usr/bin/env node
// The blog server's retained memory per render, for the deterministic Lighthouse pass
// (.aidev/run-lighthouse-fixture.sh): server renders must not stay reachable after
// their response.
//
//   node heap-check.mjs --origin http://127.0.0.1:3000 [--warmup 300] [--requests 1000]
//                       [--concurrency 16] [--max-growth-mb 50] [--max-timer-growth 50]
//
// The blog server runs with --expose-gc and DENSER_DEBUG_MEM=true, so
// /blog/api/debug/mem forces a full GC and reports process.memoryUsage() and the
// pending Timeouts. The blog routes of the Lighthouse set are rendered --warmup
// times, memory is read, they are rendered --requests more times, memory is read
// again. The check fails when heapUsed or the pending Timeouts grew past the bounds:
// anything a render leaves reachable (a request-scoped timer keeps the whole request
// alive until it fires) grows both with every request.
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';

const require = createRequire(import.meta.url);
const GC_PASSES = 3;

const { values } = parseArgs({
  options: {
    origin: { type: 'string' },
    warmup: { type: 'string', default: '300' },
    requests: { type: 'string', default: '1000' },
    concurrency: { type: 'string', default: '16' },
    'max-growth-mb': { type: 'string', default: '50' },
    'max-timer-growth': { type: 'string', default: '50' }
  }
});
if (!values.origin) {
  console.error('--origin is required');
  process.exit(64);
}

const routes = Object.keys(require('../../scripts/ci-helpers/lighthouse-thresholds.json').integration).filter(
  (route) => route.startsWith('/blog/')
);

async function render(route) {
  const response = await fetch(values.origin + route, { redirect: 'manual' });
  await response.arrayBuffer();
  if (response.status >= 500) throw new Error(`${route}: HTTP ${response.status}`);
}

async function renderMany(count) {
  let next = 0;
  const worker = async () => {
    while (next < count) await render(routes[next++ % routes.length]);
  };
  await Promise.all(Array.from({ length: Number(values.concurrency) }, worker));
}

async function memoryAfterGc() {
  let memory;
  for (let pass = 0; pass < GC_PASSES; pass++) {
    const response = await fetch(`${values.origin}/blog/api/debug/mem`);
    if (!response.ok) throw new Error(`/blog/api/debug/mem: HTTP ${response.status} (DENSER_DEBUG_MEM unset?)`);
    memory = await response.json();
  }
  return memory;
}

await renderMany(Number(values.warmup));
const before = await memoryAfterGc();
await renderMany(Number(values.requests));
const after = await memoryAfterGc();

const heapGrowthMb = after.heapUsed_mb - before.heapUsed_mb;
const timerGrowth = after.activeTimeouts - before.activeTimeouts;
console.log(`routes: ${routes.join(' ')}`);
console.log(`after ${values.warmup} warm-up renders: ${JSON.stringify(before)}`);
console.log(`after ${values.requests} more renders: ${JSON.stringify(after)}`);
console.log(`heapUsed growth: ${heapGrowthMb.toFixed(1)} MB, pending Timeouts growth: ${timerGrowth}`);

const failures = [];
if (heapGrowthMb > Number(values['max-growth-mb'])) {
  failures.push(`heapUsed grew ${heapGrowthMb.toFixed(1)} MB (bound ${values['max-growth-mb']} MB)`);
}
if (timerGrowth > Number(values['max-timer-growth'])) {
  failures.push(`pending Timeouts grew by ${timerGrowth} (bound ${values['max-timer-growth']})`);
}
if (failures.length) {
  console.error(`The blog server retains its renders: ${failures.join('; ')}`);
  process.exit(1);
}
console.log('within bounds');
