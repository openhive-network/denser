/**
 * API nodes the node picker offers. The CSP `connect-src` allows each of them, so a node the user
 * picks is the one the browser calls. They are not failover targets: some do not serve the full API.
 */
export const PICKER_API_NODES: readonly string[] = [
  'https://api.hive.blog',
  'https://api.openhive.network',
  'https://api.syncad.com',
  'https://anyx.io',
  'https://techcoderx.com',
  'https://hive.roelandp.nl',
  'https://api.deathwing.me',
  'https://api.c0ff33a.uk',
  'https://hive-api.arcange.eu',
  'https://hive-api.3speak.tv',
  'https://hiveapi.actifit.io'
];
