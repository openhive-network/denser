import { configuredImagesEndpoint } from '@hive/ui/config/public-vars';

/**
 * Connection hints for the configured image host, rendered in the root layout `<head>`.
 *
 * No `crossorigin`: feed and avatar images are plain `<img>` (no-cors) requests, which
 * would not reuse a CORS-mode preconnected socket.
 */
export function ImagesHostHints() {
  const imagesOrigin = new URL(configuredImagesEndpoint).origin;
  return (
    <>
      <link rel="preconnect" href={imagesOrigin} />
      <link rel="dns-prefetch" href={imagesOrigin} />
    </>
  );
}
