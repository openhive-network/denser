import env from '@beam-australia/react-env';

const MAINNET_CHAIN_ID = 'beeab0de00000000000000000000000000000000000000000000000000000000';

export const siteConfig = {
  name: 'Hive Blog',
  url: 'https://hive.blog',
  endpoint: `${env('API_ENDPOINT') ? env('API_ENDPOINT') : 'https://api.hive.blog'}`,
  chainId: `${env('CHAIN_ID') ? env('CHAIN_ID') : MAINNET_CHAIN_ID}`,
  isMainnet: env('CHAIN_ID') === MAINNET_CHAIN_ID,
  ogImage: '',
  description: 'Social media site for Hive Blockchain',
  links: {
    twitter: '/',
    github: '/'
  }
};

export type SiteConfig = typeof siteConfig;
