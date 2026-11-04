import sanitizeHtml from 'sanitize-html';

const LINK_CLASS = ' text-destructive break-words';
const CODE_CLASS = 'whitespace-normal';
const SUB_CLASS = 'leading-[150%]';
const VIDEO_WRAPPER_CLASS = 'videoWrapper';

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
const encodeText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// The renderer's own schemes (TagTransformingSanitizer): the class pass keeps every link it allowed.
const ALLOWED_SCHEMES = ['http', 'https', 'hive'];

const getClassTokens = (value: string | undefined) => [...new Set((value ?? '').split(/\s+/).filter(Boolean))];

function withoutVideoWrapperClass(attribs: sanitizeHtml.Attributes): sanitizeHtml.Attributes {
  const tokens = getClassTokens(attribs.class);
  if (!tokens.includes(VIDEO_WRAPPER_CLASS)) return attribs;
  const { class: _class, ...rest } = attribs;
  const kept = tokens.filter((token) => token !== VIDEO_WRAPPER_CLASS);
  return kept.length ? { ...rest, class: kept.join(' ') } : rest;
}

function withAddedClass(attribs: sanitizeHtml.Attributes, token: string): sanitizeHtml.Attributes {
  const tokens = getClassTokens(attribs.class);
  return { ...attribs, class: (tokens.includes(token) ? tokens : [...tokens, token]).join(' ') };
}

function adaptElementClasses(tagName: string, attribs: sanitizeHtml.Attributes): sanitizeHtml.Tag {
  const adapted = withoutVideoWrapperClass(attribs);
  if (tagName === 'a') return { tagName, attribs: { ...adapted, class: LINK_CLASS } };
  if (tagName === 'code') return { tagName, attribs: { ...adapted, class: CODE_CLASS } };
  if (tagName === 'sub') return { tagName, attribs: withAddedClass(adapted, SUB_CLASS) };
  return { tagName, attribs: adapted };
}

// Keeps every element and attribute of the renderer's output: only the classes change, on parsed
// elements, and text is serialized escaped again, so no text ever turns into markup.
const CLASS_ADAPTATION: sanitizeHtml.IOptions = {
  allowedTags: false,
  // The input is the renderer's already-sanitized output and this pass only rewrites classes, so
  // sanitize-html's warning about allowing script and style is noise on every render.
  allowVulnerableTags: true,
  allowedAttributes: false,
  allowedSchemes: ALLOWED_SCHEMES,
  parseStyleAttributes: false,
  transformTags: { '*': adaptElementClasses }
};

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
 * Expects the renderer's sanitized output, whose text holds no raw `<` and whose attributes are
 * double-quoted and escaped.
 */
export function toCommunityDescriptionHtml(html: string): string {
  const withoutEmbeds = html
    .replace(IFRAMES, (_iframe: string, attributes: string) => encodeText(getIframeUrl(attributes)))
    .replace(FACADES, (_facade: string, attributes: string) => encodeText(getFacadeUrl(attributes)));
  return sanitizeHtml(withoutEmbeds, CLASS_ADAPTATION);
}
