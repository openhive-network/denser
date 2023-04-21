export const siteConfig = {
  name: 'Hive Blog',
  url: 'https://hive.blog',
  endpoint: process.env.API_NODE_ENDPOINT,
  ogImage: '',
  description: 'Social media site for Hive Blockchain',
  links: {
    twitter: '/',
    github: '/'
  }
};

export type SiteConfig = typeof siteConfig;
