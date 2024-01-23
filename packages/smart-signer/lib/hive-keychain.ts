import { KeychainKeyTypes, KeychainKeyTypesLC } from 'hive-keychain-commons';
interface HiveKeychain {
    requestSignBuffer: any;
    requestBroadcast: any;
    requestSignedCall: any;
}

declare global {
    interface Window {
        hive_keychain: HiveKeychain;
    }
}

export function hasCompatibleKeychain() {
    const result = (
        window.hive_keychain
        && window.hive_keychain.requestSignBuffer
        && window.hive_keychain.requestBroadcast
        && window.hive_keychain.requestSignedCall
    );
    return !!result;
}

export async function signMessage(
    username: string,
    message: string,
    keyType: KeychainKeyTypesLC = KeychainKeyTypesLC.posting
): Promise<string> {
    const response: any = await new Promise((resolve) => {
        window.hive_keychain.requestSignBuffer(
            username,
            message,
            KeychainKeyTypes[keyType],
            (res: any) => {
                resolve(res);
            }
        );
    });
    if (response.success) {
        return response.result;
    } else {
        throw new Error(response.error);
    }
}
