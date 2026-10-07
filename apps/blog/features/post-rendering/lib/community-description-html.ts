const LINK_CLASS = ' text-destructive break-words';
const CODE_CLASS = 'whitespace-normal';
const SUB_CLASS = 'leading-[150%]';
const VIDEO_WRAPPER_CLASS = 'videoWrapper';

const LINK_OPENING_TAGS = /<a(\s[^>]*)?>/g;
const CODE_OPENING_TAGS = /<code(\s[^>]*)?>/g;
const SUB_OPENING_TAGS = /<sub(\s[^>]*)?>/g;
const CLASS_ATTRIBUTE = /\sclass="([^"]*)"/;
const CLASS_ATTRIBUTES = new RegExp(CLASS_ATTRIBUTE.source, 'g');
const IFRAMES = /<iframe\b([^>]*)>[\s\S]*?<\/iframe>/g;
const SRC_ATTRIBUTE = /\ssrc="([^"]*)"/;
// A facade holds only its label and play button: the first closing </div> is its own.
const FACADES = /<div class="(?:[^"]*\s)?embed-facade(?:\s[^"]*)?"([^>]*)>[\s\S]*?<\/div>/g;

const FACADE_URLS: Record<string, (id: string) => string> = {
  youtube: (id) => `https://www.youtube.com/watch?v=${id}`,
  threespeak: (id) => `https://play.3speak.tv/watch?v=${id}`,
  vimeo: (id) => `https://player.vimeo.com/video/${id}`,
  twitch: (id) => `https://player.twitch.tv/${id}`
};

const decodeAttribute = (value: string) =>
  value.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const encodeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const encodeText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const getClassTokens = (value: string) => [...new Set(value.split(/\s+/).filter(Boolean))];

/** The opening tag `<name attributes>` with its class set to `className`, as `element.className = …` would. */
function withClass(name: string, attributes: string, className: string): string {
  const attribute = ` class="${encodeAttribute(className)}"`;
  return CLASS_ATTRIBUTE.test(attributes)
    ? `<${name}${attributes.replace(CLASS_ATTRIBUTE, attribute)}>`
    : `<${name}${attributes}${attribute}>`;
}

/** The opening tag with `token` added to its classes, as `element.classList.add(…)` would. */
function withAddedClass(name: string, attributes: string, token: string): string {
  const current = CLASS_ATTRIBUTE.exec(attributes);
  if (!current) return withClass(name, attributes, token);
  const tokens = getClassTokens(decodeAttribute(current[1]));
  return withClass(name, attributes, tokens.includes(token) ? tokens.join(' ') : [...tokens, token].join(' '));
}

function removeVideoWrapperClass(html: string): string {
  return html.replace(CLASS_ATTRIBUTES, (attribute: string, value: string) => {
    const tokens = getClassTokens(decodeAttribute(value));
    if (!tokens.includes(VIDEO_WRAPPER_CLASS)) return attribute;
    return ` class="${encodeAttribute(tokens.filter((token) => token !== VIDEO_WRAPPER_CLASS).join(' '))}"`;
  });
}

/** The URL an iframe's `src` resolves to, as `iframe.src` reports it. */
function getIframeUrl(attributes: string): string {
  const src = SRC_ATTRIBUTE.exec(attributes);
  if (!src) return '';
  const value = decodeAttribute(src[1]);
  try {
    return new URL(value).href;
  } catch {
    return value;
  }
}

function getFacadeUrl(attributes: string): string {
  for (const [provider, toUrl] of Object.entries(FACADE_URLS)) {
    const id = new RegExp(`\\sdata-${provider}-id="([^"]*)"`).exec(attributes);
    if (id) return toUrl(decodeAttribute(id[1]));
  }
  return '';
}

/**
 * Adapts a rendered community description to the narrow sidebar it is shown in: its links take
 * the sidebar's link style, code wraps, and every embed (player iframe or click-to-load facade)
 * is shown as the URL of its video instead, so a description never loads a player.
 *
 * Expects the renderer's sanitized output, whose attributes are double-quoted and escaped.
 */
export function toCommunityDescriptionHtml(html: string): string {
  return removeVideoWrapperClass(html)
    .replace(SUB_OPENING_TAGS, (_tag: string, attributes = '') => withAddedClass('sub', attributes, SUB_CLASS))
    .replace(CODE_OPENING_TAGS, (_tag: string, attributes = '') => withClass('code', attributes, CODE_CLASS))
    .replace(LINK_OPENING_TAGS, (_tag: string, attributes = '') => withClass('a', attributes, LINK_CLASS))
    .replace(IFRAMES, (_iframe: string, attributes: string) => encodeText(getIframeUrl(attributes)))
    .replace(FACADES, (_facade: string, attributes: string) => encodeText(getFacadeUrl(attributes)));
}
