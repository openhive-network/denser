import { OnlineClient } from '@hive/hb-auth';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

class HbhbauthService {

  static onlineClient: OnlineClient;

  async getOnlineClient() {
    if (!HbhbauthService.onlineClient) {
      // TODO Pass correct config options here.
      HbhbauthService.onlineClient = await new OnlineClient().initialize();
    }
    return HbhbauthService.onlineClient;
  }

}

export const hbauthService = new HbhbauthService();
