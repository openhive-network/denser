import type { IncomingHttpHeaders } from 'http';

const DEFAULT_PORTS: Record<string, string> = { http: '80', https: '443' };
const HOST_WITH_PORT = /^(\[[0-9a-fA-F:.]+\]|[^:[\]@/?#\\\s]+)(?::(\d+))?$/;
const PORT = /^\d+$/;

interface Origin {
  scheme: string;
  hostname: string;
  port: string;
}

function headerValue(headers: IncomingHttpHeaders, name: string): string | undefined {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function firstForwarded(headers: IncomingHttpHeaders, name: string): string | undefined {
  return headerValue(headers, name)?.split(',')[0]?.trim() || undefined;
}

function parseOrigin(origin: string): Origin | undefined {
  try {
    const url = new URL(origin);
    const scheme = url.protocol.slice(0, -1);
    const port = url.port || DEFAULT_PORTS[scheme];
    return port ? { scheme, hostname: url.hostname, port } : undefined;
  } catch {
    return undefined;
  }
}

function parseHost(host: string): { hostname: string; port?: string } | undefined {
  const match = HOST_WITH_PORT.exec(host);
  if (!match) return undefined;
  try {
    return { hostname: new URL(`http://${match[1]}`).hostname, port: match[2] };
  } catch {
    return undefined;
  }
}

/**
 * The ports the request may have been made to. A port in the forwarded Host is the one the browser
 * used. Without one, the browser used the scheme's default port, or the proxy dropped the port
 * (nginx's `$host`) and names it in X-Forwarded-Port. Both are accepted because Next's server
 * fills in X-Forwarded-Port with its own listen port when the proxy sends none.
 */
function requestPorts(headers: IncomingHttpHeaders, hostPort: string | undefined, scheme: string): string[] {
  if (hostPort) return [hostPort];
  const forwardedPort = firstForwarded(headers, 'x-forwarded-port');
  const ports = [DEFAULT_PORTS[scheme]];
  if (forwardedPort && PORT.test(forwardedPort)) ports.push(forwardedPort);
  return ports;
}

function originMatchesRequest(headers: IncomingHttpHeaders, origin: Origin): boolean {
  const host = firstForwarded(headers, 'x-forwarded-host') || headerValue(headers, 'host');
  const requestHost = host ? parseHost(host) : undefined;
  if (!requestHost || requestHost.hostname !== origin.hostname) return false;
  const proto = firstForwarded(headers, 'x-forwarded-proto')?.toLowerCase();
  if (proto && proto !== origin.scheme) return false;
  const ports = requestPorts(headers, requestHost.port, proto ?? origin.scheme);
  return ports.some((port) => Number(port) === Number(origin.port));
}

/**
 * A request the browser made from a page of this site: `Sec-Fetch-Site: same-origin`, or, from a
 * browser that does not send it (any browser on a plain-HTTP site), an `Origin` naming the scheme
 * (`X-Forwarded-Proto`, when present), host and port the request was made to. The host is the
 * first `X-Forwarded-Host` behind the reverse proxy, else `Host`.
 */
export function isSameOriginRequest(headers: IncomingHttpHeaders): boolean {
  const fetchSite = headerValue(headers, 'sec-fetch-site');
  if (fetchSite) return fetchSite === 'same-origin';
  const origin = headerValue(headers, 'origin');
  const parsed = origin ? parseOrigin(origin) : undefined;
  return !!parsed && originMatchesRequest(headers, parsed);
}
