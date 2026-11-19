import type { I18nFallback } from '@ui/lib/i18n-fallback-report';
import { getLogger } from '@ui/lib/logging';
import { bufferHandledError, SentryMessage } from '@ui/lib/sentry-early-errors';

const logger = getLogger('app');

/**
 * Sends `fallback` to Sentry as a `warning` event tagged `i18n:missing`, with the language, namespace,
 * key and (when given) route as tags. One Sentry issue per language, namespace and key.
 * Call it only when a DSN is configured. Before the browser's deferred SDK load the event waits with
 * the early errors; after it, and on the server, the SDK is reached through a dynamic import() so it
 * stays out of the initial chunks.
 */
export function reportFallbackToSentry({ language, namespace, key }: I18nFallback, route?: string): void {
  const message = new SentryMessage(`Missing translation: ${language} ${namespace}:${key}`, {
    level: 'warning',
    tags: {
      i18n: 'missing',
      'i18n.language': language,
      'i18n.namespace': namespace,
      'i18n.key': key,
      ...(route ? { route } : {})
    },
    fingerprint: ['i18n:missing', language, namespace, key]
  });
  if (bufferHandledError(message)) return;
  import('@sentry/nextjs')
    .then(({ captureMessage }) => captureMessage(message.message, message.context))
    .catch((importError) => logger.error('Loading Sentry to report a missing translation failed: %o', importError));
}
