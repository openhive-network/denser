import { Client } from '@hiveio/dhive/lib/client';
import { siteConfig } from '@ui/config/site';
import env from '@beam-australia/react-env';

const HIVE_BLOG_ENDPOINT = 'hive-blog-endpoint';

export const bridgeApiCall = <T>(endpoint: string, params: object): Promise<T> =>
  bridgeServer.call('bridge', endpoint, params);

let endpoint;
if (typeof window !== 'undefined' && 'localStorage' in global && global.localStorage) {
  if (window.localStorage.getItem(HIVE_BLOG_ENDPOINT) === undefined) {
    window.localStorage.setItem(
      HIVE_BLOG_ENDPOINT,
      env('API_ENDPOINT') ? env('API_ENDPOINT') : siteConfig.endpoint
    );
  }
  endpoint = window.localStorage.getItem(HIVE_BLOG_ENDPOINT);
}

export const bridgeServer = new Client([`${endpoint}`], {
  timeout: 3000,
  failoverThreshold: 3,
  consoleOnFailover: true
});
export interface BasicPostInfo {
  author: string;
  permlink: string;
  category: string;
  depth: number;
}

export const getPostHeader = (author: string, permlink: string): Promise<BasicPostInfo> =>
  bridgeApiCall<BasicPostInfo>('get_post_header', {
    author,
    permlink
  });
