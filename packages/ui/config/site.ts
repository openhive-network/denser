import env from '@beam-australia/react-env';

import { configuredApiEndpoint, configuredSiteDomain } from '@hive/ui/config/public-vars';

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
export const siteConfig = {
  name: 'Hive Blog',
  url: configuredSiteDomain,
  endpoint: configuredApiEndpoint,
  chainId,
  chainEnv: chainEnv[chainId] || chainEnv['testnet'],
  ogImage: '',
  description: 'Social media site for Hive Blockchain',
  links: {
    twitter: '/',
    github: '/'
  },
  allowNonStrictLogin: env('ALLOW_NON_STRICT_LOGIN') === 'yes' ? true : false,
  loginAuthenticateOnBackend: env('LOGIN_AUTHENTICATE_ON_BACKEND') === 'yes' ? true : false,

  // OAUTH server
  oidcEnabled: process.env[`${SERVER_VAR_PREFIX}OIDC_ENABLED`] === 'yes' ? true : false,
  oidcUrlPrefix: process.env[`${SERVER_VAR_PREFIX}OIDC_URL_PREFIX`] || '/oidc',
  oidcInteractionUrlPrefix: process.env[`${SERVER_VAR_PREFIX}OIDC_INTERACTION_URL_PREFIX`] || '/interaction',
  oidcCookiesKeys: process.env[`${SERVER_VAR_PREFIX}OIDC_COOKIES_KEYS`]
    ? (process.env[`${SERVER_VAR_PREFIX}OIDC_COOKIES_KEYS`] as string).split(' ')
    : [],
  oidcClients: process.env[`${SERVER_VAR_PREFIX}OIDC_CLIENTS`] || '[]',
  oidcJwksKeys: process.env[`${SERVER_VAR_PREFIX}OIDC_JWKS_KEYS`] || '[]',

  // Rocket Chat Widget
  openhiveChatClientId: env('OPENHIVE_CHAT_CLIENT_ID') || 'openhive_chat',
  openhiveChatApiUri: env('OPENHIVE_CHAT_API_URI') || 'https://openhive.chat',
  openhiveChatUri: env('OPENHIVE_CHAT_URI') || 'https://openhive.chat',
  openhiveChatIframeIntegrationEnable: env('OPENHIVE_CHAT_IFRAME_INTEGRATION_ENABLE') || 'no',
  openhiveChatIframeVisible: env('OPENHIVE_CHAT_IFRAME_VISIBLE') || 'yes',
  openhiveChatAllowNonStrictLogin: env('OPENHIVE_CHAT_ALLOW_NON_STRICT_LOGIN')
    && env('OPENHIVE_CHAT_ALLOW_NON_STRICT_LOGIN') === 'yes' ? true : false,
  openhiveChatIframeCreateUsers: process.env[`${SERVER_VAR_PREFIX}OPENHIVE_CHAT_IFRAME_CREATE_USERS`] || 'no',
  openhiveChatAdminUserId: process.env[`${SERVER_VAR_PREFIX}OPENHIVE_CHAT_ADMIN_USER_ID`] || 'your-admin-user-id',
  openhiveChatAdminUserToken: process.env[`${SERVER_VAR_PREFIX}OPENHIVE_CHAT_ADMIN_USER_TOKEN`] || 'your-admin-user-token',
};

export type SiteConfig = typeof siteConfig;
