import env from '@beam-australia/react-env';

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
  url: env('SITE_DOMAIN') || 'https://hive.blog',
  endpoint: `${env('API_ENDPOINT') ? env('API_ENDPOINT') : 'https://api.hive.blog'}`,
  chainId,
  chainEnv: chainEnv[chainId] || chainEnv['testnet'],
  ogImage: '',
  description: 'Social media site for Hive Blockchain',
  links: {
    twitter: '/',
    github: '/'
  },

  oidcEnabled: process.env[`${SERVER_VAR_PREFIX}OIDC_ENABLED`] === 'true',
  oidcUrlPrefix: process.env[`${SERVER_VAR_PREFIX}OIDC_URL_PREFIX`] || '/oidc',
  oidcInteractionUrlPrefix: process.env[`${SERVER_VAR_PREFIX}OIDC_INTERACTION_URL_PREFIX`] || '/interaction',
  oidcCookiesKeys: process.env[`${SERVER_VAR_PREFIX}OIDC_COOKIES_KEYS`]
    ? (process.env[`${SERVER_VAR_PREFIX}OIDC_COOKIES_KEYS`] as string).split(' ')
    : [],
  oidcClients: process.env[`${SERVER_VAR_PREFIX}OIDC_CLIENTS`] || '[]',
  oidcJwksKeys: process.env[`${SERVER_VAR_PREFIX}OIDC_JWKS_KEYS`] || '[]',
};

export type SiteConfig = typeof siteConfig;
