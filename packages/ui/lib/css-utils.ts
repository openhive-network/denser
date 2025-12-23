/**
 * Escapes special characters in a URL for safe use within CSS url() values.
 * Prevents CSS injection attacks by escaping characters that could break out
 * of the url() context.
 */
export function escapeCssUrl(url: string): string {
  return url
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Validates that a URL is safe for use as an image source.
 * Only allows http/https protocols and blocks URLs with CSS injection characters in the path.
 */
export function isSafeImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    // Block URLs with CSS injection characters in path
    if (/['"()\\]/.test(parsed.pathname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates that a URL is safe for use as an external link.
 * Only allows http/https protocols to prevent javascript: and other dangerous schemes.
 */
export function isSafeExternalUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
