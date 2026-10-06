/**
 * Backend timing of one Lighthouse run, read from its report with no extra requests:
 * the document's TTFB, the LCP breakdown, the LCP resource, the image bytes, and a
 * per-host summary of the requests to the upstreams the page loads from.
 * Pure functions over parsed Lighthouse JSON reports; no I/O.
 */

const { median } = require('./lighthouse-median');

const LCP_SUBPARTS = {
  timeToFirstByte: 'lcp-ttfb',
  resourceLoadDelay: 'lcp-resource-load-delay',
  resourceLoadDuration: 'lcp-resource-load-duration',
  elementRenderDelay: 'lcp-element-render-delay',
};
// network-requests times count from the first request, the LCP breakdown from the
// navigation start; on one page the two differ by a few milliseconds.
const LCP_REQUEST_TOLERANCE_MS = 50;
const OTHER_HOSTS = 'other';

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

/** `api`, `images`, `origin` or `other`: which upstream `host` is, given `{ origin, images, api: [...] }`. */
function roleOf(host, upstreams) {
  if (host === upstreams.origin) return 'origin';
  if (host === upstreams.images) return 'images';
  if (upstreams.api.includes(host)) return 'api';
  return OTHER_HOSTS;
}

function roundMs(value) {
  return typeof value === 'number' ? Math.round(value) : undefined;
}

function requestDuration(request) {
  const { networkRequestTime: start, networkEndTime: end } = request;
  return typeof start === 'number' && typeof end === 'number' ? end - start : undefined;
}

function lcpSubparts(audits) {
  const table = (audits['lcp-breakdown-insight']?.details?.items || []).find((item) => item.type === 'table');
  const subparts = {};
  for (const row of table?.items || []) {
    if (LCP_SUBPARTS[row.subpart]) subparts[LCP_SUBPARTS[row.subpart]] = roundMs(row.duration);
  }
  return subparts;
}

// The start of the LCP element's URL as Lighthouse prints it in the node snippet,
// which it truncates with an ellipsis.
function lcpUrlPrefix(audits) {
  const node = (audits['lcp-breakdown-insight']?.details?.items || []).find((item) => item.type === 'node');
  const match = /\b(?:src|srcset)="(https?:\/\/[^"\s…]+)/.exec(node?.snippet || '');
  return match?.[1];
}

/**
 * The request that loaded the LCP element: the one starting when the breakdown says
 * the resource load started (TTFB + load delay). Absent for a text LCP element.
 */
function findLcpRequest(audits, requests, subparts) {
  if (typeof subparts['lcp-resource-load-delay'] !== 'number') return undefined;
  const expectedStart = (subparts['lcp-ttfb'] || 0) + subparts['lcp-resource-load-delay'];
  const prefix = lcpUrlPrefix(audits);
  let best;
  for (const request of requests) {
    if (prefix && !request.url?.startsWith(prefix)) continue;
    const offset = Math.abs((request.networkRequestTime ?? Infinity) - expectedStart);
    if (offset <= LCP_REQUEST_TOLERANCE_MS && (!best || offset < best.offset)) best = { request, offset };
  }
  return best?.request;
}

function summarizeHosts(requests, upstreams) {
  const byHost = {};
  for (const request of requests) {
    const host = hostOf(request.url);
    if (!host) continue;
    const role = roleOf(host, upstreams);
    const key = role === OTHER_HOSTS ? OTHER_HOSTS : host;
    byHost[key] ||= { role, durations: [], transferBytes: 0 };
    byHost[key].transferBytes += request.transferSize || 0;
    byHost[key].durations.push(requestDuration(request));
  }
  return Object.fromEntries(
    Object.entries(byHost).map(([host, { role, durations, transferBytes }]) => {
      const measured = durations.filter((d) => typeof d === 'number');
      return [host, {
        role,
        requests: durations.length,
        transferBytes,
        medianMs: roundMs(median(measured)),
        maxMs: measured.length ? roundMs(Math.max(...measured)) : undefined,
      }];
    })
  );
}

/**
 * Backend timing of one report. `upstreams` names the hosts to summarize one by one:
 * `{ origin: 'site.host', images: 'images.hive.blog', api: ['api.hive.blog'] }`;
 * every other host is summed up under `other`.
 */
function extractBackendTiming(report, upstreams) {
  const audits = report.audits || {};
  const requests = audits['network-requests']?.details?.items || [];
  const subparts = lcpSubparts(audits);
  const lcpRequest = findLcpRequest(audits, requests, subparts);
  const imageRow = (audits['resource-summary']?.details?.items || []).find((item) => item.resourceType === 'image');
  return {
    'server-response-time': audits['server-response-time']?.numericValue,
    ...subparts,
    'lcp-resource': lcpRequest
      ? { host: hostOf(lcpRequest.url), transferBytes: lcpRequest.transferSize, durationMs: roundMs(requestDuration(lcpRequest)) }
      : null,
    'image-transfer-bytes': imageRow?.transferSize,
    hosts: summarizeHosts(requests, upstreams),
  };
}

function mostCommon(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function medianFields(objects, fields) {
  return Object.fromEntries(fields.map((field) => [field, median(objects.map((o) => o[field]))]));
}

/**
 * The median backend timing of a route's runs: each number is the median over the
 * runs; the LCP resource is the host most runs loaded it from, with the medians of
 * those runs; each host's figures are the medians over the runs that reached it.
 */
function summarizeBackend(backends) {
  const summary = {};
  for (const key of ['server-response-time', ...Object.values(LCP_SUBPARTS), 'image-transfer-bytes']) {
    summary[key] = median(backends.map((b) => b[key]));
  }
  const lcpResources = backends.map((b) => b['lcp-resource']).filter(Boolean);
  const lcpHost = mostCommon(lcpResources.map((r) => r.host));
  summary['lcp-resource'] = lcpResources.length
    ? { host: lcpHost, ...medianFields(lcpResources.filter((r) => r.host === lcpHost), ['transferBytes', 'durationMs']) }
    : null;
  const hostNames = [...new Set(backends.flatMap((b) => Object.keys(b.hosts || {})))];
  summary.hosts = Object.fromEntries(
    hostNames.map((host) => {
      const seen = backends.map((b) => b.hosts?.[host]).filter(Boolean);
      return [host, { role: seen[0].role, ...medianFields(seen, ['requests', 'transferBytes', 'medianMs', 'maxMs']) }];
    })
  );
  return summary;
}

module.exports = { extractBackendTiming, summarizeBackend, hostOf };
