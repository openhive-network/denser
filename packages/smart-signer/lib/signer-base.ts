import { operation } from '@hive/wax/web';
import { LoginType } from '@smart-signer/types/common';
import { KeyTypes } from '@smart-signer/types/common';
import { StorageType } from '@smart-signer/lib/storage-mixin';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

export interface BroadcastTransaction {
  operation: operation;
  loginType: LoginType;
  username: string;
  keyType?: KeyTypes;
  translateFn?: (v: string) => string;
}

export interface SignChallenge {
  message: string;
  loginType: LoginType;
  username: string;
  password?: string; // private key or password to unlock hbauth key
  keyType?: KeyTypes;
  translateFn?: (v: string) => string;
}

export interface SignerOptions {
  apiEndpoint?: string;
  storageType?: StorageType;
}

export class SignerBase {
  apiEndpoint: string;
  storageType: StorageType;

  constructor({ apiEndpoint = 'https://api.hive.blog', storageType = 'localStorage' }: SignerOptions = {}) {
    this.apiEndpoint = apiEndpoint;
    this.storageType = storageType;
  }

  async destroy(username: string, loginType: LoginType) {}

  async signChallenge({}: SignChallenge): Promise<string> {
    return '';
  }

  async broadcastTransaction({}: BroadcastTransaction): Promise<{
    success: boolean;
    result: string;
    error: string;
  }> {
    return { success: false, result: '', error: '' };
  }
}
