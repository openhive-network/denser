#!/usr/bin/env node
/**
 * Probes the services a Lighthouse pass depends on: PROBE_SAMPLES sequential timed
 * requests each to the Hive API node the site's server reads from (a cheap
 * get_dynamic_global_properties), one fixed images.hive.blog proxied image, and a
 * static asset of the site itself (a control for the host and its network).
 * A sample's time runs from sending the request to reading the whole body.
 *
 * Usage: node lighthouse-probe.js --site https://host --api-node https://api.hive.blog
 *        [--image-url <url>]
 * Prints the probe result as JSON.
 */

const { parseArgs } = require('util');
const { median } = require('./lighthouse-median');

const PROBE_SAMPLES = 5;
const PROBE_TIMEOUT_MS = 15_000;
// A content-addressed post image, at the width the site requests it in.
const DEFAULT_PROBE_IMAGE =
  'https://images.hive.blog/p/YpihifdXP4WNbGMdjw7e3DuhJWBvCw4SfuLZsrnJYHEpsqZFkiGGNCQ1E1NxSLj68c2vs7zPnQrwLKrqmZUkbP3q3wzPZDgonMwfLxAfUWo2aMKRnhqDFmavEzqRuHxq6WrX7QCsgTCnLcEwByWjUBesuk8Y3L7LiY48rYmcf8CE?format=match&mode=fit&width=640';
const ORIGIN_ASSET = '/blog/favicon.ico';

/** The probe targets for a site, its server's API node and the probe image. */
function probeTargets({ site, apiNode, imageUrl = DEFAULT_PROBE_IMAGE }) {
  return {
    api: {
      url: apiNode,
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'condenser_api.get_dynamic_global_properties', params: [], id: 1 }),
      },
    },
    images: { url: imageUrl },
    origin: { url: `${site}${ORIGIN_ASSET}` },
  };
}

async function timeRequest({ url, init }) {
  const started = performance.now();
  const response = await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
  const body = await response.arrayBuffer();
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { ms: performance.now() - started, bytes: body.byteLength };
}

async function probeTarget(target, samples) {
  const times = [];
  const errors = [];
  let bytes;
  for (let i = 0; i < samples; i++) {
    try {
      const sample = await timeRequest(target);
      times.push(sample.ms);
      bytes = sample.bytes;
    } catch (err) {
      errors.push(err.message);
    }
  }
  return {
    url: target.url,
    samples,
    failures: errors.length,
    medianMs: times.length ? Math.round(median(times)) : undefined,
    maxMs: times.length ? Math.round(Math.max(...times)) : undefined,
    bytes,
    ...(errors.length ? { errors: [...new Set(errors)] } : {}),
  };
}

/** `{ <name>: { url, samples, failures, medianMs, maxMs, bytes, errors? } }` for each target. */
async function probeEnvironment(targets, samples = PROBE_SAMPLES) {
  const result = {};
  for (const [name, target] of Object.entries(targets)) {
    result[name] = await probeTarget(target, samples);
  }
  return result;
}

module.exports = { probeTargets, probeEnvironment, DEFAULT_PROBE_IMAGE };

if (require.main === module) {
  const { values } = parseArgs({
    options: { site: { type: 'string' }, 'api-node': { type: 'string' }, 'image-url': { type: 'string' } },
  });
  if (!/^https?:\/\//.test(values.site || '') || !/^https?:\/\//.test(values['api-node'] || '')) {
    console.error('usage: --site https://host --api-node https://node [--image-url <url>]');
    process.exit(1);
  }
  probeEnvironment(
    probeTargets({ site: values.site.replace(/\/+$/, ''), apiNode: values['api-node'], imageUrl: values['image-url'] })
  ).then((result) => console.log(JSON.stringify(result, null, 2)));
}
