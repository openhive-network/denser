const TWITCH_PLAYER_HOSTS = new Set(['player.twitch.tv', 'clips.twitch.tv']);

// The renderer's sanitizer writes every attribute double-quoted, `&` as `&amp;`.
const IFRAME_SRC_ATTRIBUTE = /(<iframe\b[^>]*?\s)src="([^"]*)"/g;
const DEFERRED_SRC_ATTRIBUTE = 'data-twitch-src';

const decodeAttribute = (value: string) => value.replace(/&amp;/g, '&');

function parseTwitchPlayerUrl(src: string): URL | null {
  try {
    // A protocol-relative src (`//player.twitch.tv/...`) is resolved as https.
    const url = new URL(src, 'https://invalid.invalid');
    return TWITCH_PLAYER_HOSTS.has(url.hostname) ? url : null;
  } catch {
    return null;
  }
}

/**
 * `src` with `hostname` among its `parent` parameters when it is a Twitch player or clips URL:
 * Twitch refuses to play on a site its `parent` list does not name. The parents `src` already
 * has are kept; a `src` that names `hostname` already, or of another provider, is returned as is.
 */
export function withTwitchParent(src: string, hostname: string): string {
  const url = parseTwitchPlayerUrl(src);
  if (!url || url.searchParams.getAll('parent').includes(hostname)) return src;
  url.searchParams.append('parent', hostname);
  return url.toString();
}

/**
 * Moves the `src` of each Twitch iframe in rendered body HTML to `data-twitch-src`, so the
 * iframe loads nothing until `loadTwitchIframes` adds the hostname, which only the browser
 * knows for sure. Other iframes are left alone.
 */
export function deferTwitchIframes(html: string): string {
  return html.replace(IFRAME_SRC_ATTRIBUTE, (attribute: string, prefix: string, src: string) =>
    parseTwitchPlayerUrl(decodeAttribute(src)) ? `${prefix}${DEFERRED_SRC_ATTRIBUTE}="${src}"` : attribute
  );
}

/** Loads the Twitch iframes `deferTwitchIframes` deferred under `root`, with `hostname` as a parent. */
export function loadTwitchIframes(root: ParentNode, hostname: string): void {
  root.querySelectorAll<HTMLIFrameElement>(`iframe[${DEFERRED_SRC_ATTRIBUTE}]`).forEach((iframe) => {
    const src = iframe.getAttribute(DEFERRED_SRC_ATTRIBUTE) ?? '';
    iframe.removeAttribute(DEFERRED_SRC_ATTRIBUTE);
    iframe.src = withTwitchParent(src, hostname);
  });
}
