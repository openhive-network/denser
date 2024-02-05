export type User = {
    isLoggedIn: boolean
    username: string
    avatarUrl: string
    loginType: LoginTypes;
    storageType: StorageTypes; // The storage on client side where user's private keys are stored in.
}

export enum StorageTypes {
    localStorage = 'localStorage',
    sessionStorage = 'sessionStorage',
    memoryStorage = 'memoryStorage',
}

export enum LoginTypes {
    wif = 'wif',
    hbauth = 'hbauth',
    hiveauth = 'hiveauth',
    hivesigner = 'hivesigner',
    keychain = 'keychain',
}

export enum KeyTypes {
    posting = "posting",
    active = "active",
    memo = "memo"
}

export interface IronSessionData {
    user?: User;
}

export interface SiteConfigItem {
    value: any;
    description: string;
    userEditable: boolean;
}

export interface SiteConfig {
    appName: SiteConfigItem;
    apiEndpoint: SiteConfigItem;
}
