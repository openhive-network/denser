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

// Example transaction.
const txJSON_1 =
{
  "expiration": "2024-02-21T06:55:40",
  "extensions": [],
  "operations": [
    {
      "type": "account_update2_operation",
      "value": {
        "account": "thatcryptodave",
        "extensions": [],
        "json_metadata": "",
        "posting_json_metadata": "{\"name\":\"David P.\",\"about\":\"\",\"website\":\"\",\"location\":\"Ontario, Canada\",\"birthday\":\"03.28.1984\",\"profile\":{\"name\":\"David P.\",\"about\":\"\",\"website\":\"\",\"location\":\"Ontario, Canada\",\"birthday\":\"03.28.1984\",\"profile_image\":\"\",\"cover_image\":\"\"}}"
      }
    }
  ],
  "signatures": [
    "1f6ad21ddf9f57f1a94c1462185744cb0ea779ec1e99899f2556a3ce02b18d1b810fcddaccb349a53037798aea8023909447df756db461235ba5b63984d515c977"
  ],
  "ref_block_num": 26295,
  "ref_block_prefix": 26859167
};

// Example transaction: transfer.
const txJSON_2 =
{
  "ref_block_num": 17664,
  "ref_block_prefix": 3011179533,
  "expiration": "2024-03-12T11:41:42",
  "operations": [
      {
          "type": "transfer_operation",
          "value": {
              "from": "guest4test7",
              "to": "guest4test7",
              "amount": {
                  "amount": "1",
                  "precision": 3,
                  "nai": "@@000000021"
              },
              "memo": "ba9a6620-1650-4ea2-b9d7-e99e54eeac7a"
          }
      }
  ],
  "signatures": [
      "1f1401516691196d862f4cc4ae09209e9f9c7058841d103f7b3006290a778ecf5371f60aa23009d4eb20d0a0a051748ba27f8723f8f72c5145b58360b6f51f6407"
  ]
};

const txJSON_3 = {
  "ref_block_num": 10616,
  "ref_block_prefix": 2214017753,
  "extensions": [],
  "expiration": "2022-09-07T20:22:36",
  "operations": [
    {
      "type": "transfer_operation",
      "value": {
        "to": "stirlitz",
        "from": "tester.one",
        "memo": "refund by admin",
        "amount": {
          "nai": "@@000000021",
          "amount": 500,
          "precision": 3
        }
      }
    }
  ],
  "signatures": [
    "1f5153220cf812f41e43856f327dccfc68d05a5d608cf811011edf21aaab9ad7495b785f36c5a7160a4cfc49b4e6655564ddef4ce1c2501f4fb19de2bc3b8cbf3f"
  ]
};


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
