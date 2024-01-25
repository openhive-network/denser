import { OnlineClient } from '@hive/hb-auth';
import { KeychainKeyTypes } from 'keychain-sdk';
import { KeychainKeyTypesLC } from '@smart-signer/lib/signer-keychain';
import { PrivateKey, cryptoUtils } from '@hiveio/dhive';

import { getLogger } from '@hive/ui/lib/logging';
import createBeekeeperApp from '@hive/beekeeper';

import { getDynamicGlobalProperties } from '@ui/lib/hive';
import { createWaxFoundation, TBlockHash, createHiveChain, BroadcastTransactionRequest, vote, operation } from '@hive/wax';

const logger = getLogger('app');

class AuthService {

  static onlineClient: OnlineClient;

  async getOnlineClient() {
    if (!AuthService.onlineClient) {
      AuthService.onlineClient = await new OnlineClient().initialize();
    }
    return AuthService.onlineClient;
  }

}

export const authService = new AuthService();
