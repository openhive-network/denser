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

  // Scrub breadcrumbs (navigation, console, fetch logs may contain sensitive data)
  if (event.breadcrumbs) {
    for (const crumb of event.breadcrumbs) {
      if (typeof crumb.message === 'string') {
        crumb.message = scrubSensitiveData(crumb.message);
      }
      if (typeof crumb.data === 'object' && crumb.data) {
        for (const [key, val] of Object.entries(crumb.data)) {
          if (typeof val === 'string') {
            (crumb.data as Record<string, unknown>)[key] = scrubSensitiveData(val);
          }
        }
      }
    }
  }

  // Scrub extra context
  if (event.extra) {
    for (const [key, val] of Object.entries(event.extra)) {
      if (typeof val === 'string') {
        event.extra[key] = scrubSensitiveData(val);
      }
    }
  }

  return event;
}
