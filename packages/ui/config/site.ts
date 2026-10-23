import env from '@beam-australia/react-env';

import { configuredApiEndpoint, configuredRestApiEndpoint, configuredSiteDomain } from '@hive/ui/config/public-vars';
import { chatAppUrl, resolveChatProvider, resolveMatrixChatConfig } from '@hive/ui/config/chat';

const SERVER_VAR_PREFIX = 'DENSER_SERVER_';

const MAINNET_CHAIN_ID = 'beeab0de00000000000000000000000000000000000000000000000000000000';
const MIRRORNET_CHAIN_ID = '42';

export type ChainEnv = 'mainnet' | 'mirrornet' | 'testnet';

const chainEnv: Record<string, ChainEnv> = {
  [MAINNET_CHAIN_ID]: 'mainnet',
  [MIRRORNET_CHAIN_ID]: 'mirrornet',
  'testnet': 'testnet'
};

const chainId = env('CHAIN_ID') ? env('CHAIN_ID') : MAINNET_CHAIN_ID;
const chatProvider = resolveChatProvider(env('CHAT_PROVIDER'));
const matrixChat = resolveMatrixChatConfig(env);
const openhiveChatUri = env('OPENHIVE_CHAT_URI') || 'https://openhive.chat';
export const siteConfig = {
  name: 'Hive Blog',
  url: configuredSiteDomain,
  endpoint: configuredApiEndpoint,
  restApiEndpoint: configuredRestApiEndpoint,
  chainId,
  chainEnv: chainEnv[chainId] || chainEnv['testnet'],
  ogImage: '',
  description: 'Social media site for Hive Blockchain',
  links: {
    twitter: '/',
    github: '/'
  },
  loginAuthenticateOnBackend: env('LOGIN_AUTHENTICATE_ON_BACKEND') === 'yes' ? true : false,

  googleDrive: {
    clientId: env('GOOGLE_DRIVE_CLIENT_ID') || '',
    walletFileName: env('GOOGLE_DRIVE_WALLET_FILE_NAME') || 'hivebridge_wallet.json',
    scopes: [
      'https://www.googleapis.com/auth/drive.appdata'
    ].join(' '),
    redirectUri: 'postmessage', // Using 'postmessage' to prevent reloading the page
  },

  // OAUTH server
  oidcEnabled: process.env[`${SERVER_VAR_PREFIX}OIDC_ENABLED`] === 'yes' ? true : false,
  oidcUrlPrefix: process.env[`${SERVER_VAR_PREFIX}OIDC_URL_PREFIX`] || '/oidc',
  oidcInteractionUrlPrefix: process.env[`${SERVER_VAR_PREFIX}OIDC_INTERACTION_URL_PREFIX`] || '/interaction',
  oidcCookiesKeys: process.env[`${SERVER_VAR_PREFIX}OIDC_COOKIES_KEYS`]
    ? (process.env[`${SERVER_VAR_PREFIX}OIDC_COOKIES_KEYS`] as string).split(' ')
    : [],
  oidcClients: process.env[`${SERVER_VAR_PREFIX}OIDC_CLIENTS`] || '[]',
  oidcJwksKeys: process.env[`${SERVER_VAR_PREFIX}OIDC_JWKS_KEYS`] || '[]',

  // Chat widget: Rocket.Chat (openhive.chat) unless CHAT_PROVIDER=matrix
  chatProvider,
  // The chat app the sidebars link to
  chatAppUrl: chatAppUrl(chatProvider, matrixChat, openhiveChatUri),
  // Element Web + Synapse, signing in through denser's OAuth server
  matrixChat,

  // Rocket Chat Widget
  openhiveChatClientId: env('OPENHIVE_CHAT_CLIENT_ID') || 'openhive_chat',
  openhiveChatApiUri: env('OPENHIVE_CHAT_API_URI') || 'https://openhive.chat',
  openhiveChatUri,
  openhiveChatIframeIntegrationEnable: env('OPENHIVE_CHAT_IFRAME_INTEGRATION_ENABLE') || 'no',
  openhiveChatIframeVisible: env('OPENHIVE_CHAT_IFRAME_VISIBLE') || 'yes',
  openhiveChatAllowNonStrictLogin: env('OPENHIVE_CHAT_ALLOW_NON_STRICT_LOGIN')
    && env('OPENHIVE_CHAT_ALLOW_NON_STRICT_LOGIN') === 'yes' ? true : false,
  openhiveChatIframeCreateUsers: process.env[`${SERVER_VAR_PREFIX}OPENHIVE_CHAT_IFRAME_CREATE_USERS`] || 'no',
  openhiveChatAdminUserId: process.env[`${SERVER_VAR_PREFIX}OPENHIVE_CHAT_ADMIN_USER_ID`] || 'your-admin-user-id',
  openhiveChatAdminUserToken: process.env[`${SERVER_VAR_PREFIX}OPENHIVE_CHAT_ADMIN_USER_TOKEN`] || 'your-admin-user-token',
  // Secret for users.createToken API (required for RC 8.0.0+)
  openhiveChatCreateTokenSecret: process.env[`${SERVER_VAR_PREFIX}OPENHIVE_CHAT_CREATE_TOKEN_SECRET`] || '',
  // Comma-separated list of usernames allowed to see the chat widget (empty = all users)
  openhiveChatAllowedUsers: (env('OPENHIVE_CHAT_ALLOWED_USERS') || '').split(',').filter(Boolean),
};

export type SiteConfig = typeof siteConfig;
