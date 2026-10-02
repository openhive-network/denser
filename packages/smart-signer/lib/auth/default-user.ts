import { LoginType, User, KeyType } from '@smart-signer/types/common';

export const defaultUser: User = {
    isLoggedIn: false,
    username: '',
    avatarUrl: '',
    loginType: LoginType.hbauth,
    keyType: KeyType.posting,
    authenticateOnBackend: true,
    chatAuthToken: '',
    oauthConsent: {},
    strict: false,
};
