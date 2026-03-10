// WIF private keys: base58check starting with 5H, 5J, or 5K, 51-52 chars total
const WIF_PATTERN = /5[HJK][1-9A-HJ-NP-Za-km-z]{49,50}/g;
const REDACTED = '[REDACTED]';

export function scrubSensitiveData(text: string): string {
  return text.replace(WIF_PATTERN, REDACTED);
}

/**
 * Sentry beforeSend hook that scrubs WIF keys from error events.
 * Uses loose typing to avoid depending on @sentry/types in this shared package.
 */
export function scrubEvent(event: Record<string, any>): Record<string, any> {
  if (typeof event.message === 'string') {
    event.message = scrubSensitiveData(event.message);
  }
  if (event.exception?.values) {
    for (const ex of event.exception.values) {
      if (typeof ex.value === 'string') {
        ex.value = scrubSensitiveData(ex.value);
      }
    }
  }
  return event;
}
