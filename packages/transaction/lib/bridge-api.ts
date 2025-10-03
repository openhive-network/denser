import { IGetPostHeader, IUnreadNotifications } from './extended-hive.chain';
import { hiveChainService } from './hive-chain-service';

const chain = hiveChainService.getHiveChain();

export const getPostHeader = async (author: string, permlink: string): Promise<IGetPostHeader> => {
  return (await chain).api.bridge.get_post_header({
    author,
    permlink
  });
};
export const getUnreadNotifications = async (account: string): Promise<IUnreadNotifications | null> => {
  return (await chain).api.bridge.unread_notifications({
    account
  });
};
