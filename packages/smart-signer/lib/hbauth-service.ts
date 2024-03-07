import { OnlineClient } from '@hive/hb-auth';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

class HbauthService {

  static onlineClient: OnlineClient;

  async getOnlineClient() {
    if (!HbauthService.onlineClient) {
      // TODO Pass correct config options here.
      HbauthService.onlineClient = await new OnlineClient().initialize();
    }
    return HbauthService.onlineClient;
  }

}

export const hbauthService = new HbauthService();
