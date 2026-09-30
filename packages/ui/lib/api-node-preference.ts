/**
 * Preferred Hive JSON-RPC API node for denser.
 *
 * Client stores the choice in localStorage (`node-endpoint`). SSR cannot read
 * localStorage, so we also mirror an allowlisted value into the `api-node`
 * cookie so server components can use the same node (hive/denser#952).
 *
 * Cookie values are validated against REACT_APP_ALLOWED_HIVE_API_NODES (when
 * set) or the default healthchecker provider list, so the cookie cannot be
 * used to turn the server into an open proxy (SSRF).
 */

import { siteConfig } from '@hive/ui/config/site';

export const API_NODE_COOKIE = 'api-node';
export const API_NODE_STORAGE_KEY = 'node-endpoint';

/** Same defaults as useHealthChecker (blog/wallet healthchecker UI). */
export const DEFAULT_HIVE_API_NODES = [
  'https://api.hive.blog',
  'https://api.openhive.network',
  'https://anyx.io',
  'https://techcoderx.com',
  'https://hive.roelandp.nl',
  'https://api.deathwing.me',
  'https://api.c0ff33a.uk',
  'https://hive-api.arcange.eu',
  'https://hive-api.3speak.tv',
  'https://hiveapi.actifit.io'
] as const;

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

export function normalizeApiNodeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function readAllowedNodesEnv(): string | undefined {
  if (typeof process !== 'undefined' && process.env?.REACT_APP_ALLOWED_HIVE_API_NODES) {
    return process.env.REACT_APP_ALLOWED_HIVE_API_NODES;
  }
  return undefined;
}

/**
 * Nodes the server (and cookie writes) are allowed to use.
 * Env list wins when set; otherwise defaults + configured site endpoint.
 */
export function getAllowedHiveApiNodes(): string[] {
  const fromEnv = readAllowedNodesEnv();
  if (fromEnv) {
    return fromEnv
      .split(/[ ,]+/)
      .filter(Boolean)
      .map(normalizeApiNodeUrl);
  }

  const nodes = new Set<string>();
  nodes.add(normalizeApiNodeUrl(siteConfig.endpoint));
  for (const node of DEFAULT_HIVE_API_NODES) {
    nodes.add(normalizeApiNodeUrl(node));
  }
  return [...nodes];
}

export function isAllowedHiveApiNode(url: string): boolean {
  let normalized: string;
  try {
    normalized = normalizeApiNodeUrl(url);
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
  } catch {
    return false;
  }

  return getAllowedHiveApiNodes().some((allowed) => allowed === normalized);
}

/**
 * Write (or clear) the SSR-readable api-node cookie. Client only.
 * Rejects non-allowlisted URLs.
 */
export function setApiNodeCookie(endpoint: string | null): void {
  if (typeof document === 'undefined') return;

  if (!endpoint) {
    document.cookie = `${API_NODE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    return;
  }

  if (!isAllowedHiveApiNode(endpoint)) {
    return;
  }

  const value = encodeURIComponent(normalizeApiNodeUrl(endpoint));
  document.cookie = `${API_NODE_COOKIE}=${value}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function parseStoredEndpoint(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'string') return undefined;
    const normalized = normalizeApiNodeUrl(parsed);
    return isAllowedHiveApiNode(normalized) ? normalized : undefined;
  } catch {
    return undefined;
  }
}

/** Preferred node from localStorage (client). */
export function readPreferredApiNodeFromLocalStorage(): string | undefined {
  if (typeof window !== 'object' || !window.localStorage) return undefined;
  return parseStoredEndpoint(window.localStorage.getItem(API_NODE_STORAGE_KEY));
}

/**
 * Preferred node from the api-node cookie.
 * `getCookieValue` is injected so callers can use document.cookie or next/headers.
 */
export function readPreferredApiNodeFromCookie(
  getCookieValue: (name: string) => string | undefined
): string | undefined {
  const raw = getCookieValue(API_NODE_COOKIE);
  if (!raw) return undefined;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return undefined;
  }
  const normalized = normalizeApiNodeUrl(decoded);
  return isAllowedHiveApiNode(normalized) ? normalized : undefined;
}

/** Mirror localStorage → cookie so the next SSR request sees the preference. */
export function syncApiNodeCookieFromLocalStorage(): void {
  const fromLs = readPreferredApiNodeFromLocalStorage();
  if (fromLs) {
    setApiNodeCookie(fromLs);
  }
}

/**
 * Resolve the preferred JSON-RPC endpoint for this environment:
 * - browser: localStorage
 * - server: api-node cookie via next/headers (when available)
 */
export function resolvePreferredApiNode(): string | undefined {
  if (typeof window === 'object' && window.localStorage) {
    return readPreferredApiNodeFromLocalStorage();
  }

  if (typeof window === 'undefined') {
    try {
      // Dynamic require keeps this module importable from client bundles.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { cookies } = require('next/headers') as typeof import('next/headers');
      const store = cookies();
      return readPreferredApiNodeFromCookie((name) => store.get(name)?.value);
    } catch {
      // Outside a Next.js request (tests, scripts) — no cookie available.
      return undefined;
    }
  }

  return undefined;
}
