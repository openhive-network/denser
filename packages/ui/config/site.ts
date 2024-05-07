import env from '@beam-australia/react-env';

export const siteConfig = {
  name: 'Hive Blog',
  url: 'https://hive.blog',
  endpoint: `${env('API_ENDPOINT') ? env('API_ENDPOINT') : 'https://api.hive.blog'}`,
  chainId: `${env('CHAIN_ID') ? env('CHAIN_ID') : 'beeab0de00000000000000000000000000000000000000000000000000000000'}`,
  ogImage: '',
  description: 'Social media site for Hive Blockchain',
  links: {
    twitter: '/',
    github: '/'
  }
};

export type SiteConfig = typeof siteConfig;
