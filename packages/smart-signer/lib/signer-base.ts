import { operation } from '@hive/wax/web';
import { LoginTypes } from '@smart-signer/types/common';
import { KeyTypes } from '@smart-signer/types/common';
import { StorageType } from '@smart-signer/lib/storage-mixin';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

export interface BroadcastTransaction {
    operation: operation;
    loginType: LoginTypes;
    username: string;
    keyType?: KeyTypes;
    translateFn?: (v: string) => string;
}

export interface SignChallenge {
    message: string;
    loginType: LoginTypes;
    username: string;
    password?: string; // private key or password to unlock hbauth key
    keyType?: KeyTypes;
    translateFn?: (v: string) => string;
}

export interface SignerOptions {
    username: string;
    apiEndpoint?: string;
    storageType?: StorageType;
    keyType?: KeyTypes.posting;
    loginType?: LoginTypes;
}

export class SignerBase {

    apiEndpoint: string;
    storageType: StorageType;
    keyType: KeyTypes;
    loginType: LoginTypes;
    username: string;

    constructor({
        username,
        apiEndpoint = 'https://api.hive.blog',
        storageType = 'localStorage',
        keyType = KeyTypes.posting,
        loginType = LoginTypes.hbauth,
    }: SignerOptions) {
        this.username = username;
        this.apiEndpoint = apiEndpoint;
        this.storageType = storageType;
        this.keyType = keyType;
        this.loginType = loginType;
    }

    async destroy(username: string, loginType: LoginTypes) {}

    async signChallenge({}: SignChallenge): Promise<string> {
        return '';
    }

    async broadcastTransaction(
            {}: BroadcastTransaction
        ): Promise<{ success: boolean; result: string; error: string }> {
            return { success: false, result: '', error: '' };
        }

}
