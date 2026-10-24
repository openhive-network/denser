/** Which chat server the chat widget and the "chat" links use. */
export type ChatProvider = 'rocketchat' | 'matrix';

/**
 * When the chat widget loads Element, hidden, ahead of the drawer's first opening: once the page
 * is idle after loading or on intent to use the chat button (`idle`), on that intent only
 * (`intent`), or not before the drawer opens (`off`).
 */
export type MatrixChatPreload = 'idle' | 'intent' | 'off';

/** What the chat drawer shows: denser's own client (`native`) or Element in an iframe (`element`). */
export type MatrixChatClient = 'native' | 'element';

export interface MatrixChatConfig {
  /** Element Web, the client the widget embeds, without a trailing slash */
  elementUrl: string;
  /** Synapse's client API base URL, without a trailing slash */
  homeserverUrl: string;
  /** The part after `:` in Matrix user IDs; the homeserver's host unless set */
  serverName: string;
  /** Synapse's id of the identity provider that signs in through denser */
  idpId: string;
  /** Alias or ID of the room Element opens in; `#general` of the server unless set */
  defaultRoom: string;
  preload: MatrixChatPreload;
  client: MatrixChatClient;
}

/** Reads a public setting by its unprefixed name, as `@beam-australia/react-env`'s `env()` does. */
export type ReadPublicEnv = (key: string) => string | undefined;

const DEFAULT_MATRIX_IDP_ID = 'oidc-denser';
const DEFAULT_MATRIX_ROOM_ALIAS = '#general';
const MATRIX_CHAT_PRELOADS: readonly MatrixChatPreload[] = ['idle', 'intent', 'off'];

/**
 * Page served from Element's origin (stack/matrix/chat-origin) that the widget loads first: it
 * replaces an Element session of anyone but the expected user, then continues into Element or SSO.
 */
export const MATRIX_SESSION_PAGE_PATH = '/denser-session.html';

const withoutTrailingSlash = (url: string): string => url.replace(/\/+$/, '');

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

/** `CHAT_PROVIDER`: `matrix` selects Matrix; anything else, or nothing, keeps Rocket.Chat. */
export function resolveChatProvider(value: string | undefined): ChatProvider {
  return value?.trim().toLowerCase() === 'matrix' ? 'matrix' : 'rocketchat';
}

/** `MATRIX_CHAT_CLIENT`: `element` keeps Element's iframe; anything else, or nothing, is `native`. */
function resolveMatrixChatClient(value: string | undefined): MatrixChatClient {
  return value?.trim().toLowerCase() === 'element' ? 'element' : 'native';
}

/** `MATRIX_CHAT_PRELOAD`: `idle`, `intent` or `off`, in any case; anything else, or nothing, is `idle`. */
function resolveMatrixChatPreload(value: string | undefined): MatrixChatPreload {
  const preload = value?.trim().toLowerCase();
  return MATRIX_CHAT_PRELOADS.find((known) => known === preload) ?? 'idle';
}

export function resolveMatrixChatConfig(read: ReadPublicEnv): MatrixChatConfig {
  const homeserverUrl = withoutTrailingSlash(read('MATRIX_HOMESERVER_URL')?.trim() || '');
  const serverName = read('MATRIX_SERVER_NAME')?.trim() || hostOf(homeserverUrl);
  return {
    elementUrl: withoutTrailingSlash(read('MATRIX_ELEMENT_URL')?.trim() || ''),
    homeserverUrl,
    serverName,
    idpId: read('MATRIX_IDP_ID')?.trim() || DEFAULT_MATRIX_IDP_ID,
    defaultRoom: read('MATRIX_DEFAULT_ROOM')?.trim() || (serverName ? `${DEFAULT_MATRIX_ROOM_ALIAS}:${serverName}` : ''),
    preload: resolveMatrixChatPreload(read('MATRIX_CHAT_PRELOAD')),
    client: resolveMatrixChatClient(read('MATRIX_CHAT_CLIENT'))
  };
}

/** The origin of `url`, or undefined for one that does not parse */
export function originOf(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

/**
 * The origins a page must allow its chat frame to load, or none when Element is not in use:
 * Element's, and the homeserver's, which the frame passes through during SSO sign-in.
 */
export function matrixFrameOrigins(provider: ChatProvider, matrix: MatrixChatConfig): string[] {
  if (provider !== 'matrix' || matrix.client !== 'element' || !matrix.elementUrl) return [];
  const elementOrigin = originOf(matrix.elementUrl);
  if (!elementOrigin) return [];
  const homeserverOrigin = originOf(matrix.homeserverUrl);
  return [...new Set(homeserverOrigin ? [elementOrigin, homeserverOrigin] : [elementOrigin])];
}

/**
 * The origins the page itself must reach for the native chat client, or none when it is not in
 * use: the homeserver's, for the client API and the media its avatars are fetched from.
 */
export function matrixClientOrigins(provider: ChatProvider, matrix: MatrixChatConfig): string[] {
  if (provider !== 'matrix' || matrix.client !== 'native') return [];
  const homeserverOrigin = originOf(matrix.homeserverUrl);
  return homeserverOrigin ? [homeserverOrigin] : [];
}

export function matrixUserId(username: string, matrix: Pick<MatrixChatConfig, 'serverName'>): string {
  return `@${username}:${matrix.serverName}`;
}

/** The themes the session page sets in Element, as `next-themes` resolves denser's. */
const MATRIX_THEMES: ReadonlySet<string> = new Set(['light', 'dark']);

/**
 * Where the widget's iframe starts for `username`: the session page on Element's origin, which
 * signs that user in through `idpId` unless Element already holds their session, then opens
 * `defaultRoom`, in `theme` when that is `light` or `dark` (otherwise Element keeps its own).
 * The page asks `parentOrigin`, the origin of the page framing it, for a login token first, and
 * takes an answer from that origin only; without one it signs in through SSO.
 * Without a username it only ends whatever Element session the browser holds.
 */
export function matrixSessionPageUrl(
  matrix: MatrixChatConfig,
  username?: string,
  theme?: string,
  parentOrigin?: string
): string {
  const url = new URL(`${matrix.elementUrl}${MATRIX_SESSION_PAGE_PATH}`);
  if (username) {
    url.searchParams.set('user', matrixUserId(username, matrix));
    url.searchParams.set('idp', matrix.idpId);
    if (matrix.defaultRoom) url.searchParams.set('room', matrix.defaultRoom);
    if (theme && MATRIX_THEMES.has(theme)) url.searchParams.set('theme', theme);
    if (parentOrigin) url.searchParams.set('parent', parentOrigin);
  }
  return url.toString();
}

/** The chat app the sidebars link to. */
export function chatAppUrl(provider: ChatProvider, matrix: MatrixChatConfig, rocketChatUrl: string): string {
  return provider === 'matrix' && matrix.elementUrl ? matrix.elementUrl : rocketChatUrl;
}
