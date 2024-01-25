import { KeychainSDK, KeychainKeyTypes } from 'keychain-sdk';
import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('app');

// See https://github.com/hive-keychain/keychain-sdk

export enum KeychainKeyTypesLC {
  posting = "posting",
  active = "active",
  memo = "memo"
}

export async function hasCompatibleKeychain() {
  const keychain = new KeychainSDK(window);
  return await keychain.isKeychainInstalled();
}



export async function signBuffer(
  message: string,
  username: string,
  method: KeychainKeyTypes = KeychainKeyTypes.posting,
) {
  // try {
    const keychain = new KeychainSDK(window);
    console.log('bamboo %o', keychain);
    const check = await keychain.isKeychainInstalled();
    console.log({check});
    if (!(check)) {
      throw new Error('keychain is not installed');
    }
    console.log('gjsa');
    const signBuffer = await keychain.signBuffer(
      {
        username: 'keychain.tests',
        message: 'message!!',
        method: 'Posting',
        title: 'Login in Into Saturnoman.com\nProceed?',
      },
    );
    console.log({ signBuffer });
  // } catch (error) {
  //   console.log({ error });
  // }
}

export const signBufferNew = async (
  message: string,
  username: string,
  method: KeychainKeyTypes = KeychainKeyTypes.posting,
) => {
  logger.info('in signBuffer %o', { message, username, method });
  const keychain = new KeychainSDK(window);
  try {
    // if (!(await keychain.isKeychainInstalled())) {
    //   throw new Error('keychain is not installed');
    // }
    logger.info('bamboo 1');
    const response = await keychain.signBuffer({
      username,
      message,
      method,
    });
    logger.info('bamboo 2');
    if (response.error) {
      throw new Error(`signBuffer error: ${response.error}`);
    }
    return response.result;
  } catch (error) {
    throw error;
  }
};

export async function signBufferOld(
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

