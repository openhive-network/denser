import { KeychainKeyTypes, KeychainKeyTypesLC } from 'hive-keychain-commons';
interface HiveKeychain {
    requestSignBuffer: any;
    requestBroadcast: any;
    requestSignedCall: any;
    requestSignTx: any;
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

export async function signBuffer(
    message: string,
    username: string,
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

export const signTx = async (
    username: string,
    tx: any,
    method: KeychainKeyTypesLC = KeychainKeyTypesLC.posting,
) => {
    return new Promise(async (resolve, reject) => {
      try {
        window.hive_keychain.requestSignTx(
          username,
          tx,
          method,
          (response: any) => {

            console.info('bamboo response', response);
            reject(response);

            if (response.error) {
              reject(response);
            } else {
              resolve(response);
            }
          },
        );
      } catch (error) {
        throw error;
      }
    });
  };

