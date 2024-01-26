export type User = {
    isLoggedIn: boolean
    username: string
    avatarUrl: string
    loginType: LoginTypes;
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
