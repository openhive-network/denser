export enum LoginType {
    hbauth = 'hbauth',
    keychain = 'keychain',
    hiveauth = 'hiveauth',
    wif = 'wif',
    hivesigner = 'hivesigner',
}

export enum KeyType {
    posting = 'posting',
    active = 'active'
}

export enum StorageType {
    localStorage = 'localStorage',
    sessionStorage = 'sessionStorage',
    memoryStorage = 'memoryStorage',
}

export type User = {
    isLoggedIn: boolean
    username: string
    avatarUrl: string
    loginType: LoginType;
    keyType: KeyType;
    authenticateOnBackend: boolean;
    chatAuthToken: string;
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
