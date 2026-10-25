import { headers } from 'next/headers';
import { NONCE_HEADER, parseNonce } from '@hive/middleware/lib/csp';
import { type IJsonLdNode, serializeJsonLd } from '@/blog/lib/json-ld';

/**
 * A `<script type="application/ld+json">` holding `data`, escaped by `serializeJsonLd`. A data
 * block never runs, but it carries the request's CSP nonce like every script the server renders.
 */
export async function JsonLd({ data }: { data: IJsonLdNode }) {
  const nonce = parseNonce((await headers()).get(NONCE_HEADER));
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
