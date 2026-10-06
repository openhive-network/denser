import { useEffect, useMemo, useState } from 'react';
import { getLogger } from '@ui/lib/logging';
import type { RenderBodyOptions } from '../lib/render-body';

const logger = getLogger('app');

type RenderBodyModule = typeof import('../lib/render-body');

// Loaded on first use, so the renderer stays out of the page's initial JS.
let renderBodyModule: RenderBodyModule | undefined;

async function loadRenderBody(): Promise<RenderBodyModule> {
  renderBodyModule ??= await import('../lib/render-body');
  return renderBodyModule;
}

/**
 * Renders `body` in the browser, for bodies the server didn't render (edits, replies just posted,
 * previews). Returns undefined until the renderer has loaded, or when there is no body.
 */
export function useClientRenderedBody(
  body: string | undefined,
  { author, permlink, mainPost, communityDescription, proxyAuthToken }: RenderBodyOptions
): string | undefined {
  const [loaded, setLoaded] = useState(() => Boolean(renderBodyModule));

  useEffect(() => {
    if (!body || loaded) return;
    let active = true;
    loadRenderBody()
      .then(() => {
        if (active) setLoaded(true);
      })
      .catch((error) => logger.error(error, 'Failed to load the post renderer'));
    return () => {
      active = false;
    };
  }, [body, loaded]);

  return useMemo(
    () =>
      body && loaded && renderBodyModule
        ? renderBodyModule.renderBody(body, { author, permlink, mainPost, communityDescription, proxyAuthToken })
        : undefined,
    [body, loaded, author, permlink, mainPost, communityDescription, proxyAuthToken]
  );
}
