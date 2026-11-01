import { bootstrapOf, getApiSetView } from '@transaction/lib/api-sets/router';
import { API_SETS_BOOTSTRAP_ID } from '@ui/config/api-set-ids';
import { safeJsonForScript } from '@ui/lib/html-escape-json';

/**
 * The nodes the server routed this page's API sets to, for the browser's own calls: a JSON data
 * block, which never runs, but carries the request's CSP nonce like every script the server renders.
 * Renders nothing where the server routes by configuration only.
 */
export async function ApiSetsBootstrap({ nonce }: { nonce?: string }) {
  const view = await getApiSetView();
  if (!view) return null;
  return (
    <script
      id={API_SETS_BOOTSTRAP_ID}
      type="application/json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: safeJsonForScript(bootstrapOf(view)) }}
    />
  );
}
