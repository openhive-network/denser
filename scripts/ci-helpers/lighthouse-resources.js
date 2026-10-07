/**
 * What a page fetched, from one Lighthouse report: transfer totals by resource type,
 * the WebAssembly it loaded, and the requests that left an allowed set of hosts.
 * Pure functions; no I/O.
 */

const NON_NETWORK_SCHEMES = new Set(['data:', 'blob:', 'about:', 'chrome-extension:']);

function summaryRow(report, resourceType) {
  return (report.audits?.['resource-summary']?.details?.items || []).find((item) => item.resourceType === resourceType);
}

/** Image bytes, all bytes and the request count of a run (`undefined` where the report has none). */
function extractResourceTotals(report) {
  const total = summaryRow(report, 'total');
  return {
    'image-transfer-bytes': summaryRow(report, 'image')?.transferSize,
    'total-transfer-bytes': total?.transferSize,
    'request-count': total?.requestCount,
  };
}

/**
 * The transfer bytes of every `.wasm` (or `application/wasm`) request of a run, 0 when
 * it loaded none; `undefined` when the report lists no requests. A page fetches its
 * WebAssembly, so the resource summary counts it under `other`, not `script`.
 */
function wasmTransferBytes(report) {
  const requests = report.audits?.['network-requests']?.details?.items;
  if (!requests) return undefined;
  return requests
    .filter((request) => request.mimeType === 'application/wasm' || /\.wasm(?:[?#]|$)/.test(request.url || ''))
    .reduce((sum, request) => sum + (request.transferSize || 0), 0);
}

/**
 * The URLs of every request in the run whose host is not in `allowedHosts`
 * (`host` or `host:port`, as `URL.host` spells it), deduplicated, in request order.
 * `data:` and `blob:` URLs never leave the browser and are not counted.
 */
function offHostRequests(report, allowedHosts) {
  const allowed = new Set(allowedHosts);
  const seen = new Set();
  for (const { url } of report.audits?.['network-requests']?.details?.items || []) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      seen.add(url);
      continue;
    }
    if (NON_NETWORK_SCHEMES.has(parsed.protocol) || allowed.has(parsed.host)) continue;
    seen.add(url);
  }
  return [...seen];
}

module.exports = { extractResourceTotals, wasmTransferBytes, offHostRequests };
