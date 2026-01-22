import type { OnlineClient, OfflineClient } from '@hiveio/hb-auth';

import { getOnlineClient, getOfflineClient } from "@hive/common-hiveio-packages";

class HbauthService {
  async getOnlineClient(): Promise<OnlineClient> {
    return await getOnlineClient();
  }
  async getOfflineClient(): Promise<OfflineClient> {
    return await getOfflineClient();
  }
}

export const hbauthService = new HbauthService();
