export type User = {
    isLoggedIn: boolean
    username: string
    avatarUrl: string
    loginType: LoginTypes;
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
    active = "active"
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
