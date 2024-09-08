import {
  IHiveChainInterface,
  ApiTransaction,
  ApiAuthority,
  TAccountName,
  ApiKeyAuth,
  TTransactionPackType
} from '@hiveio/wax';
import { hiveChainService } from '@transaction/lib/hive-chain-service';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');


export enum AuthorityLevel {
  ACTIVE = 'ACTIVE',
  POSTING = 'POSTING',
  OWNER = 'OWNER',
};

const authorityStrictChecker = async (
  publicKey: string,
  signer: TAccountName,
  expectedAuthorityLevel: AuthorityLevel,
  hiveChain: IHiveChainInterface
): Promise<boolean> => {
  try {
    const findAccountsResponse = await hiveChain.api.database_api
        .find_accounts({ accounts: [signer] });
    const foundAccountInfo = findAccountsResponse.accounts;
    logger.info(`Found # ${foundAccountInfo.length} account info(s): %o`, foundAccountInfo);

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
          throw new Error("Bad value");
      }
      const keyMatchResult: boolean = authorityToVerify.key_auths.some(
        (auth: ApiKeyAuth): boolean => { return auth["0"] === publicKey; }
      );
      return keyMatchResult;
    }

    return false;
  } catch (error) {
    logger.error('error in authorityStrictChecker: %o', error);
    throw error;
  }

}

export const authorityChecker = async (
  txJSON: ApiTransaction,
  expectedSignerAccount: string,
  expectedAuthorityLevel: AuthorityLevel,
  pack: TTransactionPackType,
  strict: boolean     // check if signer key is directly in key authority
): Promise<boolean> =>  {
  try {
    logger.info('authorityChecker args: %o',
      { txJSON, expectedSignerAccount, expectedAuthorityLevel, pack });

    const hiveChain: IHiveChainInterface = await hiveChainService.getHiveChain();
    const txBuilder = hiveChain.Transaction.fromApi(txJSON);

    const authorityVerificationResult = await hiveChain.api.database_api
        .verify_authority({
          trx: JSON.parse(txBuilder.toApi()),
          pack
        });

    if (!authorityVerificationResult.valid) {
        logger.info("Transaction has specified invalid authority");
        return false;
    }

    logger.info('Transaction is signed correctly');
    // When strict is false there's no reason to  do other checks, so we
    // return now.
    if (!strict) return true;

    logger.info([
      "Going to validate, that key used to generate signature is",
      "directly specified in signer key authority"
    ].join(' '));

    // Extract public keys from signatures.
    let signatureKeys: string[] = [];
    if (pack === TTransactionPackType.HF_26) {
      signatureKeys = txBuilder.signatureKeys;
    } else if (pack === TTransactionPackType.LEGACY) {
      signatureKeys = txBuilder.legacy_signatureKeys;
    }

    // Below is some additional code just to make a reverse check for
    // public keys used to generate given signature
    for (const signatureKey of signatureKeys) {
      const key = "STM" + signatureKey;
      const referencedAccounts = (
        await hiveChain.api.account_by_key_api
        .get_key_references({ keys: [key] })
        ).accounts;

      const accounts: Array<Array<string>> =
        new Array<Array<string>>(...referencedAccounts);
      const accountList = accounts.join(",");

      logger.info([
        `Public key used to sign transaction: ${key}`,
        `is referenced by account(s): ${accountList}`,
      ].join(' '));

      const directSigner = await authorityStrictChecker(
        key, expectedSignerAccount, expectedAuthorityLevel, hiveChain
        );

      if (directSigner) {
        logger.info([
          `The account: ${expectedSignerAccount}`,
          `directly authorized the transaction`
        ].join(' '));
        return true;
      } else {
        logger.info([
          `WARNING: some other account(s): ${accountList}`,
          `than: ${expectedSignerAccount} authorized the transaction`
        ].join(' '));
      }

    }

    return false;

  } catch (error) {
    logger.error('Error in authorityChecker: %o', error);
    throw error;
  }

};
