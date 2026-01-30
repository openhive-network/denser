export enum LoginType {
    Hbauth = 'hbauth',
    Keychain = 'keychain',
    Peakvault = 'peakvault',
    Metamask = 'metamask',
    Google = 'google',
    Hiveauth = 'hiveauth',
    Wif = 'wif',
    Hivesigner = 'hivesigner',
}

export enum KeyType {
    Posting = 'posting',
    Active = 'active'
}

export enum StorageType {
    LocalStorage = 'localStorage',
    SessionStorage = 'sessionStorage',
    MemoryStorage = 'memoryStorage',
}

export type User = {
    isLoggedIn: boolean
    username: string
    avatarUrl: string
    loginType: LoginType;
    keyType: KeyType;
    authenticateOnBackend: boolean;
    chatAuthToken: string;
    oauthConsent: { [key: string]: boolean } // `key` is oauth client_id
    strict: boolean;
}

export interface OAuthState {
    clientId: string;
    redirectUri: string;
    scope?: string;
    state?: string;
}

export interface IronSessionData {
    user?: User;
    oauthState?: OAuthState;
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
