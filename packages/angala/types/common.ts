export type User = {
    isLoggedIn: boolean
    username: string
    avatarUrl: string
    loginType: string;
}

export enum LoginTypes {
    password = 'password',
    hbauth = 'hbauth',
    hiveauth = 'hiveauth',
    hivesigner = 'hivesigner',
    keychain = 'keychain',
}

export interface IronSessionData {
    user?: User;
}
