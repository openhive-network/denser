import { KeychainSDK, KeychainKeyTypes } from 'keychain-sdk';

// See https://github.com/hive-keychain/keychain-sdk

export enum KeychainKeyTypesLC {
  posting = "posting",
  active = "active",
  memo = "memo"
}

export const hasCompatibleKeychain = async () => {
  const keychain = new KeychainSDK(window);
  return await keychain.isKeychainInstalled();
}


export const signBuffer = async(
  message: string,
  username: string,
  method: KeychainKeyTypes = KeychainKeyTypes.posting,
) => {
  const keychain = new KeychainSDK(window);
  try {
    if (!(await keychain.isKeychainInstalled())) {
      throw new Error('keychain is not installed');
    }
    const response = await keychain.signBuffer({
      username,
      message,
      method,
    });
    if (response.error) {
      throw new Error(`signBuffer error: ${response.error}`);
    }
    return response.result;
  } catch (error) {
    throw error;
  }
};


export const signTx = async (
    username: string,
    tx: any,
    method: KeychainKeyTypes = KeychainKeyTypes.posting,
) => {
    const keychain = new KeychainSDK(window);
    try {
      if (!(await keychain.isKeychainInstalled())) {
        throw new Error('keychain is not installed');
      }
      const response = await keychain.signTx({
        username,
        method,
        tx,
      });
      console.info('bamboo response', response);
      if (response.error) {
        throw new Error(`signTx error: ${response.error}`);
      }
      return response;
    } catch (error) {
      throw error;
    }
  };

