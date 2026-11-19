import { isLiteDid } from '../../lite-account/lite-did.ts';

interface ExplorerReader {
  isLoggedIn: boolean;
  username: string;
}

/**
 * Where a general block explorer link leads: the signed-in Hive account's page on `explorerHost`,
 * else the explorer's home page. A lite account has no page there.
 */
export function explorerUrl(explorerHost: string, reader: ExplorerReader): string {
  const { isLoggedIn, username } = reader;
  if (!isLoggedIn || !username || isLiteDid(username)) return explorerHost;
  return `${explorerHost}/@${username}`;
}
