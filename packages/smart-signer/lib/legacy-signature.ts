import {
    createHiveChain,
    IHiveChainInterface,
    ApiTransaction,
    ApiAuthority,
    TAccountName,
    ApiKeyAuth,
    transaction,
    TTransactionPackType,
    transfer
} from '@hive/wax';


/**
 * You should instantiate hiveChain, like also preconfigure beekeeper
 * wallet before calling this funtion, what is out of scope of this
 * example.
 */
const supplementLegacySignature = async (
    signer: TAccountName,
    hiveChain: IHiveChainInterface,
    wallet: IBeekeeperUnlockedWallet,
    publicKey: string
    ) => {

    const txBuilder = await hiveChain.getTransactionBuilder();

    const myTransfer: transfer = transfer.create({
        from_account: signer,
        to_account: signer,
        amount: hiveChain.hive(1),
        memo: "ba9a6620-1650-4ea2-b9d7-e99e54eeac7a"
    });

    txBuilder.push({ transfer: myTransfer });

    let apiTx = txBuilder.toApi();

    console.log(`Built API transaction: ${apiTx}`);
    console.log(`API transaction id (HF26): ${txBuilder.id}`);
    console.log(`API transaction sigDigest (HF26): ${txBuilder.sigDigest}`);

    let legacyApiTx = txBuilder.toLegacyApi();

    console.log(`Built Legacy API transaction: ${legacyApiTx}`);
    console.log(`API transaction id (legacy): ${txBuilder.legacy_id}`);
    console.log(`API transaction sigDigest (legacy): ${txBuilder.legacy_sigDigest}`);

    const sd = txBuilder.legacy_sigDigest;

    /**
     * Here beekeeper wallet acts like some other (external) signature
     * provider, be able just to sign digest. This way you can pass
     * given computed sigDigest to i.e. to Keychain.
     *
     * In case given signing tool has missing support for signing just
     * precomputed digest, you can pass the transaction in HF-26 or
     * Legacy API JSON form and once it was signed, retrieve signature
     * from it to supplement processed transaction in txBuilder object.
     */
    const legacySignature = wallet.signDigest(publicKey, sd);
    console.log(`Produced legacy signature: ${legacySignature}`);

    /// Supplement built transaction object by precomputed signature
    txBuilder.build(legacySignature);

    legacyApiTx = txBuilder.toLegacyApi();
    console.log(`Built Signed Legacy API transaction: ${legacyApiTx}`);

    apiTx = txBuilder.toApi();

    const authorityVerificationResult = await hiveChain.api.database_api
        .verify_authority({
            trx: JSON.parse(apiTx),
            pack: TTransactionPackType.LEGACY
        });

    if (authorityVerificationResult) {
        console.log("Transaction is CORRECTLY signed");
    }
    else {
        console.log("BAD SIGNATURE");
    }
}
