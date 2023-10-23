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
