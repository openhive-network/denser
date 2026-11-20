import { isLiteDid } from '../../lite-account/lite-did.ts';

const DEFAULT_EXPLORER = 'https://explore.openhive.network';

interface ExplorerReader {
  isLoggedIn: boolean;
  username: string;
}

/**
 * Where a general block explorer link leads: the signed-in Hive account's page on `explorerHost`,
 * else the explorer's home page. A lite account has no page there. An unset `explorerHost` (no
 * `EXPLORER_DOMAIN` in the environment) falls back to the default explorer, since `Link` cannot
 * render an undefined `href`.
 */
export function explorerUrl(explorerHost: string | undefined, reader?: ExplorerReader): string {
  const host = explorerHost || DEFAULT_EXPLORER;
  if (!reader?.isLoggedIn || !reader.username || isLiteDid(reader.username)) return host;
  return `${host}/@${reader.username}`;
}
