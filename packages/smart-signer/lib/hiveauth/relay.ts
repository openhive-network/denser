import { configuredHiveAuth } from '@ui/config/public-vars';
import { siteConfig } from '@ui/config/site';
import { getImageSrc } from '@ui/lib/path-utils';
import { HiveAuthChannel } from '@smart-signer/lib/hiveauth/channel';
import { NoncedHasClient } from '@smart-signer/lib/hiveauth/nonced-has-client';

let channel: HiveAuthChannel | undefined;

/** The page's channel to the configured HAS relay (`HIVEAUTH_SERVER`), connected on its first request. */
export function getHiveAuthChannel(): HiveAuthChannel {
  if (!channel) {
    const { serverUrl } = configuredHiveAuth;
    // HasClient takes the relay without its scheme and puts `wss://` back in front
    const client = new NoncedHasClient(serverUrl.replace(/^wss:\/\//, ''), '', false);
    channel = new HiveAuthChannel(client, serverUrl, {
      name: siteConfig.name,
      description: window.location.host,
      icon: `${window.location.origin}${getImageSrc('/smart-signer/images/hive-blog-twshare.png')}`
    });
  }
  return channel;
}
