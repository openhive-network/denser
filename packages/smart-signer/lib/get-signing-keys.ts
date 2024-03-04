import {
  createHiveChain,
  IHiveChainInterface,
  transaction,
  ApiTransaction,
  ApiAuthority,
  TAccountName,
  TWaxExtended,
  ApiKeyAuth
} from '@hive/wax';
import { Type } from "class-transformer";
import { ValidateNested } from "class-validator";

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

class VerifyAuthorityRequest {
  @ValidateNested()
  @Type(() => ApiTransaction)
  public trx!: ApiTransaction;
};

class VerifyAuthorityResponse {
  public valid: boolean;
};

enum AuthorityLevel {
  ACTIVE,
  POSTING,
  OWNER
};

const DatabaseApiExtensions = {
  database_api: {
    verify_authority: {
      params: VerifyAuthorityRequest,
      result: VerifyAuthorityResponse
    }
  }
};

type TExtendedHiveChain = TWaxExtended<typeof DatabaseApiExtensions>;

const authorityStrictChecker = async (
  public_key: string, signer: TAccountName,
  expectedAuthorityLevel: AuthorityLevel,
  extendedHiveChain: TExtendedHiveChain
): Promise<boolean> => {
  try {
    const findAccountsResponse = await extendedHiveChain.api.database_api
        .find_accounts({ accounts: [signer] });

    const foundAccountInfo = findAccountsResponse.accounts;

    console.log(`Found # ${foundAccountInfo.length} account info(s)...`);

    for (let i in findAccountsResponse.accounts) {
      const accountInfo = findAccountsResponse.accounts[i];

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
        (auth: ApiKeyAuth): boolean => { return auth["0"] === public_key; }
      );

      return keyMatchResult;
    }

    return false;
  } catch (error) {
    logger.error('error in authorityStrictChecker: %o', error);
    throw error;
  }

}

export const main = async (): Promise<void> =>  {
  try {
    /// This is your tx received from KeyChain after signing
    const txJSON = {
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

    const tx: transaction = transaction.fromJSON(txJSON);

    const hiveChain: IHiveChainInterface = await createHiveChain();
    const txBuilder = hiveChain.TransactionBuilder.fromApi(txJSON);

    const sigDigest = txBuilder.sigDigest;
    console.log(`sigDigest of passed transaction is: ${sigDigest}`);

    const extendedChain: TExtendedHiveChain = hiveChain.extend(DatabaseApiExtensions);

    const expectedSignerAccount: string = "thatcryptodave";
    let expectedAuthorityLevel: AuthorityLevel = AuthorityLevel.POSTING;

    const authorityVerificationResult = await extendedChain.api.database_api.verify_authority({ trx: txJSON });

    console.log('bamboo');

    if (authorityVerificationResult.valid) {
      console.log("Transaction is CORRECTLY signed, going to additionally validate that key used to genrate signature is directly specified in Signer account authority");

      const signatureKeys = txBuilder.signatureKeys;

      /// Below is some additional code just to make a reverse check for public keys used to generate given signature
      for (let i in signatureKeys) {
        const key = "STM" + signatureKeys[i];
        const referencedAccounts = (await hiveChain.api.account_by_key_api.get_key_references({ keys: [key] })).accounts;

        const acnts: Array<Array<string>> = new Array<Array<string>>(...referencedAccounts);
        const acntList = acnts.join(",");

        console.log(`Public key used to sign transaction: ${key} is referenced by account(s): ${acntList}`);

        const directSigner = await authorityStrictChecker(key, expectedSignerAccount, expectedAuthorityLevel, extendedChain);

        if (directSigner)
          console.log(`The account: ${expectedSignerAccount} directly authorized the transaction`);
        else
          console.log(`WARNING: some other account(s): ${acntList} than: ${expectedSignerAccount} authorized the transaction`);
      }
    }
    else {
      console.log("Transaction has specified INVALID authority");
    }
  } catch (error) {
    logger.error('error in main: %o', error);
    throw error;
  }
};
