/**
 * URL and DOM ID Sanitization Utilities
 *
 * This module provides security utilities to prevent XSS attacks through:
 * - URL manipulation (javascript:, data:, vbscript: protocols)
 * - DOM-based XSS via element IDs
 * - Hash fragment injection
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
 * @see https://owasp.org/www-community/attacks/DOM_Based_XSS
 */

/**
 * Dangerous URL protocols that can execute JavaScript or other code.
 * Case-insensitive matching is used to catch obfuscation attempts.
 */
const DANGEROUS_PROTOCOLS = [
  'javascript:',
  'vbscript:',
  'data:',
  'file:',
  'blob:',
  'about:',
  'ms-its:',
  'its:',
  'mhtml:',
  'filesystem:'
];

/**
 * Pattern for valid DOM element IDs.
 * HTML5 allows almost any characters except spaces, but we restrict to safe characters
 * to prevent injection attacks.
 *
 * Allowed: letters, numbers, hyphens, underscores, colons, periods, forward slashes, @
 * This covers common anchor patterns like:
 * - @username/permlink (after URL decoding)
 * - section-1
 * - heading_title
 */
const SAFE_ELEMENT_ID_PATTERN = /^[a-zA-Z0-9_:./@-]+$/;

/**
 * Maximum length for element IDs to prevent DoS via regex.
 */
const MAX_ELEMENT_ID_LENGTH = 256;

/**
 * Checks if a URL uses a dangerous protocol that could execute code.
 *
 * @param url - The URL to check
 * @returns true if the URL uses a dangerous protocol
 *
 * @example
 * isDangerousProtocol('javascript:alert(1)') // true
 * isDangerousProtocol('https://example.com') // false
 * isDangerousProtocol('JaVaScRiPt:alert(1)') // true (case-insensitive)
 */
export function isDangerousProtocol(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Normalize: trim whitespace and convert to lowercase for comparison
  // Also handle encoded characters that might bypass simple checks
  const normalized = url.trim().toLowerCase();

  // Check for dangerous protocols
  for (const protocol of DANGEROUS_PROTOCOLS) {
    if (normalized.startsWith(protocol)) {
      return true;
    }
  }

  // Check for encoded versions (e.g., javascript&#58; or java\nscript:)
  // Decode and re-check
  try {
    const decoded = decodeURIComponent(normalized.replace(/\s+/g, ''));
    for (const protocol of DANGEROUS_PROTOCOLS) {
      if (decoded.startsWith(protocol)) {
        return true;
      }
    }
  } catch {
    // If decoding fails, the URL is malformed - treat as potentially dangerous
    // but don't block since it might just be invalid encoding
  }

  return false;
}

/**
 * Validates and sanitizes a URL for safe navigation.
 * Returns the original URL if safe, or undefined if dangerous.
 *
 * @param url - The URL to sanitize
 * @returns The original URL if safe, undefined if dangerous
 *
 * @example
 * sanitizeUrl('https://example.com') // 'https://example.com'
 * sanitizeUrl('javascript:alert(1)') // undefined
 * sanitizeUrl('/path/to/page') // '/path/to/page'
 */
export function sanitizeUrl(url: string): string | undefined {
  if (!url || typeof url !== 'string') {
    return undefined;
  }

  if (isDangerousProtocol(url)) {
    return undefined;
  }

  return url;
}

/**
 * Validates a DOM element ID for safe use with getElementById/querySelector.
 * Prevents DOM clobbering and injection attacks.
 *
 * @param id - The element ID to validate
 * @returns true if the ID is safe to use
 *
 * @example
 * isValidElementId('section-1') // true
 * isValidElementId('<script>') // false
 * isValidElementId('a'.repeat(1000)) // false (too long)
 */
export function isValidElementId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // Check length to prevent ReDoS
  if (id.length > MAX_ELEMENT_ID_LENGTH) {
    return false;
  }

  // Check against safe pattern
  return SAFE_ELEMENT_ID_PATTERN.test(id);
}

/**
 * Sanitizes a hash fragment (the part after # in a URL) for safe use.
 * Returns the sanitized hash without the # prefix, or undefined if invalid.
 *
 * @param hash - The hash fragment (with or without # prefix)
 * @returns The sanitized hash without # prefix, or undefined if invalid
 *
 * @example
 * sanitizeHash('#section-1') // 'section-1'
 * sanitizeHash('section-1') // 'section-1'
 * sanitizeHash('#<script>') // undefined
 * sanitizeHash('') // undefined
 */
export function sanitizeHash(hash: string): string | undefined {
  if (!hash || typeof hash !== 'string') {
    return undefined;
  }

  // Remove # prefix if present
  const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;

  if (!cleanHash) {
    return undefined;
  }

  // URL decode the hash (browsers encode special characters)
  let decodedHash: string;
  try {
    decodedHash = decodeURIComponent(cleanHash);
  } catch {
    // Invalid encoding - might be an attack attempt
    return undefined;
  }

  // Validate the decoded hash
  if (!isValidElementId(decodedHash)) {
    return undefined;
  }

  return decodedHash;
}

/**
 * Safely scrolls to an element by ID, validating the ID first.
 * This is a drop-in replacement for:
 * `document.getElementById(hash)?.scrollIntoView()`
 *
 * @param elementId - The ID of the element to scroll to
 * @param options - ScrollIntoView options
 * @returns true if scroll was performed, false if ID was invalid or element not found
 *
 * @example
 * safeScrollToElement('section-1', { behavior: 'smooth' })
 */
export function safeScrollToElement(
  elementId: string,
  options?: ScrollIntoViewOptions
): boolean {
  const sanitizedId = sanitizeHash(elementId);

  if (!sanitizedId) {
    return false;
  }

  const element = document.getElementById(sanitizedId);

  if (!element) {
    return false;
  }

  element.scrollIntoView(options);
  return true;
}

/**
 * Validates that a path is a safe internal path (not an absolute URL or protocol).
 * Used for navigation within the app.
 *
 * @param path - The path to validate
 * @returns true if the path is a safe internal path
 *
 * @example
 * isInternalPath('/trending/hive') // true
 * isInternalPath('/@username') // true
 * isInternalPath('https://evil.com') // false
 * isInternalPath('javascript:alert(1)') // false
 */
export function isInternalPath(path: string): boolean {
  if (!path || typeof path !== 'string') {
    return false;
  }

  // Must start with / for internal paths
  if (!path.startsWith('/')) {
    return false;
  }

  // Must not be a protocol-relative URL (//evil.com)
  if (path.startsWith('//')) {
    return false;
  }

  // Check for dangerous protocols (shouldn't be possible with / prefix, but be safe)
  if (isDangerousProtocol(path)) {
    return false;
  }

  return true;
}

/**
 * Constructs a safe URL by combining a base path with a path.
 * Validates both parts to prevent XSS.
 *
 * @param basePath - The base path (e.g., '/blog')
 * @param path - The path to append (e.g., '/@username')
 * @returns The combined path if safe, undefined if either part is dangerous
 *
 * @example
 * buildSafePath('/blog', '/@user') // '/blog/@user'
 * buildSafePath('/blog', 'javascript:alert(1)') // undefined
 */
export function buildSafePath(basePath: string, path: string): string | undefined {
  // Allow empty basePath
  if (basePath && !isInternalPath(basePath)) {
    return undefined;
  }

  if (!isInternalPath(path)) {
    return undefined;
  }

  return (basePath || '') + path;
}
