export const siteConfig = {
  name: 'Hive Blog',
  url: 'https://hive.blog',
  endpoint: `${process.env.NEXT_PUBLIC_API_NODE_ENDPOINT ? process.env.NEXT_PUBLIC_API_NODE_ENDPOINT : 'api.hive.blog'}`,
  ogImage: '',
  description: 'Social media site for Hive Blockchain',
  links: {
    twitter: '/',
    github: '/'
  }
};

export type SiteConfig = typeof siteConfig;
