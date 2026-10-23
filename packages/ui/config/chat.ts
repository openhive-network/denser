/** Which chat server the chat widget and the "chat" links use. */
export type ChatProvider = 'rocketchat' | 'matrix';

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
}

/** Reads a public setting by its unprefixed name, as `@beam-australia/react-env`'s `env()` does. */
export type ReadPublicEnv = (key: string) => string | undefined;

const DEFAULT_MATRIX_IDP_ID = 'oidc-denser';
const DEFAULT_MATRIX_ROOM_ALIAS = '#general';

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

export function resolveMatrixChatConfig(read: ReadPublicEnv): MatrixChatConfig {
  const homeserverUrl = withoutTrailingSlash(read('MATRIX_HOMESERVER_URL')?.trim() || '');
  const serverName = read('MATRIX_SERVER_NAME')?.trim() || hostOf(homeserverUrl);
  return {
    elementUrl: withoutTrailingSlash(read('MATRIX_ELEMENT_URL')?.trim() || ''),
    homeserverUrl,
    serverName,
    idpId: read('MATRIX_IDP_ID')?.trim() || DEFAULT_MATRIX_IDP_ID,
    defaultRoom: read('MATRIX_DEFAULT_ROOM')?.trim() || (serverName ? `${DEFAULT_MATRIX_ROOM_ALIAS}:${serverName}` : '')
  };
}

function originOf(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

/**
 * The origins a page must allow its chat frame to load, or none when Matrix is not in use:
 * Element's, and the homeserver's, which the frame passes through during SSO sign-in.
 */
export function matrixFrameOrigins(provider: ChatProvider, matrix: MatrixChatConfig): string[] {
  if (provider !== 'matrix' || !matrix.elementUrl) return [];
  const elementOrigin = originOf(matrix.elementUrl);
  if (!elementOrigin) return [];
  const homeserverOrigin = originOf(matrix.homeserverUrl);
  return [...new Set(homeserverOrigin ? [elementOrigin, homeserverOrigin] : [elementOrigin])];
}

export function matrixUserId(username: string, matrix: Pick<MatrixChatConfig, 'serverName'>): string {
  return `@${username}:${matrix.serverName}`;
}

/**
 * Where the widget's iframe starts for `username`: the session page on Element's origin, which
 * signs that user in through `idpId` unless Element already holds their session, then opens
 * `defaultRoom`. Without a username it only ends whatever Element session the browser holds.
 */
export function matrixSessionPageUrl(matrix: MatrixChatConfig, username?: string): string {
  const url = new URL(`${matrix.elementUrl}${MATRIX_SESSION_PAGE_PATH}`);
  if (username) {
    url.searchParams.set('user', matrixUserId(username, matrix));
    url.searchParams.set('idp', matrix.idpId);
    if (matrix.defaultRoom) url.searchParams.set('room', matrix.defaultRoom);
  }
  return url.toString();
}

/** The chat app the sidebars link to. */
export function chatAppUrl(provider: ChatProvider, matrix: MatrixChatConfig, rocketChatUrl: string): string {
  return provider === 'matrix' && matrix.elementUrl ? matrix.elementUrl : rocketChatUrl;
}
