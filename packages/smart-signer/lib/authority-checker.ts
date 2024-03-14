import {
  createHiveChain,
  IHiveChainInterface,
  ApiTransaction,
  ApiAuthority,
  TAccountName,
  ApiKeyAuth,
  transaction,
  TTransactionPackType
} from '@hive/wax';

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
          throw "Bad value";
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
  tx: ApiTransaction,
  expectedSignerAccount: string,
  expectedAuthorityLevel: AuthorityLevel,
  pack: TTransactionPackType
): Promise<void> =>  {
  try {
    logger.info('authorityChecker args',
      { tx, expectedSignerAccount, expectedAuthorityLevel, pack });

    // const txJSON: transaction = transaction.fromJSON(tx);
    const txJSON = tx;

    logger.info('bamboo txJSON: %o', txJSON);

    const hiveChain: IHiveChainInterface = await createHiveChain();
    const txBuilder = hiveChain.TransactionBuilder.fromApi(txJSON);
    logger.info('bamboo txBuilder: %o', txBuilder);

    const sigDigest = txBuilder.sigDigest;
    logger.info(`sigDigest of passed transaction is: ${sigDigest}`);
    const legacySigDigest = txBuilder.legacy_sigDigest;
    logger.info(`legacy_sigDigest of passed transaction is: ${legacySigDigest}`);

    const authorityVerificationResult = await hiveChain.api.database_api
        .verify_authority({
          trx: JSON.parse(txBuilder.toApi()),
          pack
        });

    if (authorityVerificationResult.valid) {
      logger.info([
        "Transaction is CORRECTLY signed, going to additionally validate",
        "that key used to generate signature is directly specified",
        "in Signer account authority"
      ].join(' '));

      const signatureKeys = txBuilder.signatureKeys;

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
          key, expectedSignerAccount, expectedAuthorityLevel, hiveChain);

        if (directSigner)
          logger.info([
            `The account: ${expectedSignerAccount}`,
            `directly authorized the transaction`
          ].join(' '));
        else
          logger.info([
            `WARNING: some other account(s): ${accountList}`,
            `than: ${expectedSignerAccount} authorized the transaction`
          ].join(' '));
      }
    }
    else {
      logger.info("Transaction has specified INVALID authority");
    }
  } catch (error) {
    logger.error('error in authorityChecker: %o', error);
    throw error;
  }

};
