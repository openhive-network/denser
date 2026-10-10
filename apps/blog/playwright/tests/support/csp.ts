import type { APIResponse, Page } from '@playwright/test';

/**
 * Helpers for the nonce-based Content-Security-Policy the proxy sets on every page
 * (packages/middleware/lib/csp.ts), shared by the blog's and the wallet's fixture specs.
 */

declare global {
  interface Window {
    __reportCspViolation?: (text: string) => void;
  }
}

/** Chromium's console wording for a blocked resource, inline script or eval. */
const CSP_CONSOLE_MESSAGE = /Content Security Policy/i;

/**
 * Records every CSP violation in `page`: `securitypolicyviolation` events of every document it
 * loads, and Chromium's console errors about the policy. Returns the (live) list of descriptions.
 */
export const recordCspViolations = async (page: Page): Promise<string[]> => {
  const violations: string[] = [];
  await page.exposeBinding('__reportCspViolation', (_source, text: string) => {
    violations.push(text);
  });
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      window.__reportCspViolation?.(
        `[event] ${event.effectiveDirective} blocked ${event.blockedURI || 'inline'} ` +
          `(${event.sourceFile}:${event.lineNumber}) on ${event.documentURI}`
      );
    });
  });
  page.on('console', (msg) => {
    if (CSP_CONSOLE_MESSAGE.test(msg.text())) violations.push(`[console] ${msg.text()}`);
  });
  return violations;
};

/** The policy a page response enforces; fails the test when there is none. */
export const cspOf = (response: APIResponse): string => {
  const policy = response.headers()['content-security-policy'];
  if (!policy) throw new Error(`${response.url()} has no Content-Security-Policy header`);
  return policy;
};

/** The source list of `policy`'s script-src directive. */
export const scriptSrcOf = (policy: string): string[] =>
  policy
    .split(';')
    .map((directive) => directive.trim().split(/\s+/))
    .find(([name]) => name === 'script-src')
    ?.slice(1) ?? [];

/** The nonce `policy` allows scripts with, or undefined. */
export const nonceOf = (policy: string): string | undefined =>
  scriptSrcOf(policy)
    .map((source) => /^'nonce-(.+)'$/.exec(source)?.[1])
    .find(Boolean);

/** The opening <script> tags of `html` that do not carry `nonce`: the policy blocks them. */
export const scriptTagsWithoutNonce = (html: string, nonce: string): string[] =>
  [...html.matchAll(/<script\b[^>]*>/g)].map(([tag]) => tag).filter((tag) => !tag.includes(`nonce="${nonce}"`));
