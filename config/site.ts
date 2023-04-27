export const siteConfig = {
  name: 'Hive Blog',
  url: 'https://hive.blog',
  endpoint: 'api.hive.blog',
  ogImage: '',
  description: 'Social media site for Hive Blockchain',
  links: {
    twitter: '/',
    github: '/'
  }
};

// @ts-ignore
global.STM_Config = siteConfig;

export type SiteConfig = typeof siteConfig;
