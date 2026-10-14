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
 * previews). Returns undefined until the renderer has loaded, or when there is no body. Code
 * blocks are plain until the syntax highlighter has loaded, then the body is rendered again.
 */
export function useClientRenderedBody(
  body: string | undefined,
  { author, permlink, mainPost, communityDescription, proxyAuthToken }: RenderBodyOptions
): string | undefined {
  const [loaded, setLoaded] = useState(() => Boolean(renderBodyModule));
  const [highlighterLoads, setHighlighterLoads] = useState(0);

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

  const html = useMemo(
    () =>
      body && loaded && renderBodyModule
        ? renderBodyModule.renderBody(body, { author, permlink, mainPost, communityDescription, proxyAuthToken })
        : undefined,
    // highlighterLoads: render again once the highlighter has loaded
    [body, loaded, author, permlink, mainPost, communityDescription, proxyAuthToken, highlighterLoads]
  );
  const awaitsHighlighter = useMemo(() => Boolean(html && renderBodyModule?.awaitsSyntaxHighlighter(html)), [html]);

  useEffect(() => {
    if (!awaitsHighlighter || !renderBodyModule) return;
    let active = true;
    renderBodyModule.loadSyntaxHighlighter().then((ready) => {
      if (active && ready) setHighlighterLoads((count) => count + 1);
    });
    return () => {
      active = false;
    };
  }, [awaitsHighlighter]);

  return html;
}
