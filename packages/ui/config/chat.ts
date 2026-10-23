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
}

/** Reads a public setting by its unprefixed name, as `@beam-australia/react-env`'s `env()` does. */
export type ReadPublicEnv = (key: string) => string | undefined;

const DEFAULT_MATRIX_IDP_ID = 'oidc-denser';

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
  return {
    elementUrl: withoutTrailingSlash(read('MATRIX_ELEMENT_URL')?.trim() || ''),
    homeserverUrl,
    serverName: read('MATRIX_SERVER_NAME')?.trim() || hostOf(homeserverUrl),
    idpId: read('MATRIX_IDP_ID')?.trim() || DEFAULT_MATRIX_IDP_ID
  };
}

/** The Element origin a page must be allowed to frame, or undefined when Matrix is not in use. */
export function matrixFrameOrigin(provider: ChatProvider, matrix: MatrixChatConfig): string | undefined {
  if (provider !== 'matrix' || !matrix.elementUrl) return undefined;
  try {
    return new URL(matrix.elementUrl).origin;
  } catch {
    return undefined;
  }
}

export function matrixUserId(username: string, matrix: MatrixChatConfig): string {
  return `@${username}:${matrix.serverName}`;
}

/**
 * Where the widget's iframe starts for `username`: the session page on Element's origin, which
 * signs that user in through `idpId` unless Element already holds their session. Without a
 * username it only ends whatever Element session the browser holds.
 */
export function matrixSessionPageUrl(matrix: MatrixChatConfig, username?: string): string {
  const url = new URL(`${matrix.elementUrl}${MATRIX_SESSION_PAGE_PATH}`);
  if (username) {
    url.searchParams.set('user', matrixUserId(username, matrix));
    url.searchParams.set('idp', matrix.idpId);
  }
  return url.toString();
}

/** The chat app the sidebars link to. */
export function chatAppUrl(provider: ChatProvider, matrix: MatrixChatConfig, rocketChatUrl: string): string {
  return provider === 'matrix' && matrix.elementUrl ? matrix.elementUrl : rocketChatUrl;
}
