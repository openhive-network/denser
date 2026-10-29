const NO_SIGNERS: readonly string[] = [];

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function signerOrigin(entry: string): string | null {
  let url: URL;
  try {
    url = new URL(entry.trim());
  } catch {
    return null;
  }
  const secure = url.protocol === 'https:' || (url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname));
  return secure ? url.origin : null;
}

function entries(raw: string): unknown[] {
  const text = raw.trim();
  if (!text.startsWith('[')) return text.split(/[\s,]+/);
  try {
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * The passkey signer origins of `REACT_APP_PASSKEY_SIGNERS`: a JSON array or a comma- or
 * space-separated list of URLs, each reduced to its origin, in order, without repeats. An entry that
 * is not an https URL (http only on a loopback host) is dropped; with none left (or unset), none: the
 * passkey sign-in is off.
 */
export function parsePasskeySigners(raw: string | undefined): readonly string[] {
  if (!raw) return NO_SIGNERS;
  const origins = entries(raw).flatMap((entry) => {
    const origin = typeof entry === 'string' ? signerOrigin(entry) : null;
    return origin ? [origin] : [];
  });
  const unique = [...new Set(origins)];
  return unique.length > 0 ? unique : NO_SIGNERS;
}
