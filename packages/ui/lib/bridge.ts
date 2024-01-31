import { Client } from "@hiveio/dhive/lib/client";
import { siteConfig } from "@ui/config/site";

export const bridgeApiCall = <T>(
  endpoint: string,
  params: object
): Promise<T> => bridgeServer.call("bridge", endpoint, params);
const endpoint =
  typeof window !== "undefined" && 'localStorage' in global && global.localStorage
    ? window.localStorage.getItem("hive-blog-endpoint")
      ? JSON.parse(String(window.localStorage.getItem("hive-blog-endpoint")))
      : siteConfig.endpoint
    : siteConfig.endpoint;

export const bridgeServer = new Client([`${endpoint}`], {
  timeout: 3000,
  failoverThreshold: 3,
  consoleOnFailover: true,
});
export interface BasicPostInfo {
  author: string;
  permlink: string;
  category: string;
  depth: number;
}

export const getPostHeader = (
  author: string,
  permlink: string
): Promise<BasicPostInfo> =>
  bridgeApiCall<BasicPostInfo>("get_post_header", {
    author,
    permlink,
  });
