/**
 * Hivemind tag validation regex.
 * Matches hivemind's rule: ^[a-z0-9\-_]+$
 * Uses hivemind's permissive rules (allows underscores) rather than
 * denser's stricter frontend rules, so the routing layer accepts
 * any tag that the API will accept.
 */
const TAG_REGEX = /^[a-z0-9\-_]+$/;

/**
 * Max tag length for routing validation.
 * Hivemind has no explicit max, but we cap at 256 (matching permlink limit)
 * to prevent abuse with extremely long URLs. Tags >24 chars can exist on chain
 * even though denser's post editor limits new tags to 24 chars.
 */
const MAX_TAG_LENGTH = 256;

/**
 * Validates tag format against hivemind rules.
 * Rules: 1-256 chars, lowercase alphanumeric + hyphens + underscores.
 */
export function isValidTagFormat(tag: string): boolean {
  if (typeof tag !== 'string') return false;
  if (tag.length === 0 || tag.length > MAX_TAG_LENGTH) return false;
  return TAG_REGEX.test(tag);
}
