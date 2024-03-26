import {
  createHiveChain,
  IHiveChainInterface,
  ApiTransaction,
  ApiAuthority,
  TAccountName,
  ApiKeyAuth
} from '@hive/wax';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

export enum AuthorityLevel {
  ACTIVE,
  POSTING,
  OWNER
}

const authorityStrictChecker = async (
  publicKey: string,
  signer: TAccountName,
  expectedAuthorityLevel: AuthorityLevel,
  hiveChain: IHiveChainInterface
): Promise<boolean> => {
  try {
    const findAccountsResponse = await hiveChain.api.database_api.find_accounts({ accounts: [signer] });

    const foundAccountInfo = findAccountsResponse.accounts;

    logger.info(`Found # ${foundAccountInfo.length} account info(s)...`);

    for (const accountInfo of findAccountsResponse.accounts) {
      let authorityToVerify: ApiAuthority;

      switch (expectedAuthorityLevel) {
        case AuthorityLevel.ACTIVE:
          authorityToVerify = accountInfo.active;
          break;
        case AuthorityLevel.POSTING:
          authorityToVerify = accountInfo.posting;
          break;
        case AuthorityLevel.OWNER:
          authorityToVerify = accountInfo.owner;
          break;
        default:
          throw 'Bad value';
      }

      const keyMatchResult: boolean = authorityToVerify.key_auths.some((auth: ApiKeyAuth): boolean => {
        return auth['0'] === publicKey;
      });

      return keyMatchResult;
    }

    return false;
  } catch (error) {
    logger.error('error in authorityStrictChecker: %o', error);
    throw error;
  }
};

export const authorityChecker = async (
  txJSON: ApiTransaction,
  expectedSignerAccount: string,
  expectedAuthorityLevel: AuthorityLevel
): Promise<void> => {
  logger.info('txJSON', txJSON);

  const hiveChain: IHiveChainInterface = await createHiveChain();
  const txBuilder = hiveChain.TransactionBuilder.fromApi(txJSON);

  const sigDigest = txBuilder.sigDigest;
  logger.info(`sigDigest of passed transaction is: ${sigDigest}`);

  const authorityVerificationResult = await hiveChain.api.database_api.verify_authority({ trx: txJSON });

  if (authorityVerificationResult.valid) {
    logger.info(
      [
        'Transaction is CORRECTLY signed, going to additionally validate',
        'that key used to generate signature is directly specified',
        'in Signer account authority'
      ].join(' ')
    );

    const signatureKeys = txBuilder.signatureKeys;

    // Below is some additional code just to make a reverse check for
    // public keys used to generate given signature
    for (let i in signatureKeys) {
      const key = 'STM' + signatureKeys[i];
      const referencedAccounts = (await hiveChain.api.account_by_key_api.get_key_references({ keys: [key] }))
        .accounts;

      const acnts: Array<Array<string>> = new Array<Array<string>>(...referencedAccounts);
      const acntList = acnts.join(',');

      logger.info(
        [`Public key used to sign transaction: ${key}`, `is referenced by account(s): ${acntList}`].join(' ')
      );

      const directSigner = await authorityStrictChecker(
        key,
        expectedSignerAccount,
        expectedAuthorityLevel,
        hiveChain
      );

      if (directSigner)
        logger.info(
          [`The account: ${expectedSignerAccount}`, `directly authorized the transaction`].join(' ')
        );
      else
        logger.info(
          [
            `WARNING: some other account(s): ${acntList}`,
            `than: ${expectedSignerAccount} authorized the transaction`
          ].join(' ')
        );
    }
  } else {
    logger.info('Transaction has specified INVALID authority');
  }
};
