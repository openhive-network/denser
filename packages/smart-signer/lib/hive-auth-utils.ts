import QRCode from 'qrcode';
import { HasClient } from 'hive-auth-client';
import { Signature, HexBuffer, cryptoUtils, PublicKey } from "@hiveio/dhive";

import { getLogger } from "@hive/ui/lib/logging";
const logger = getLogger('app');

// import CryptoJS from 'crypto-js';
// export class EnhancedHasClient extends HasClient {

//   // This doesn't work. Error message visible in Keychain Mobile
//   // Application says, that signing transactions is not implemented.

//   /**
//    * Sends a broadcast request to the server
//    * @param {Object} authData
//    * @param {string} authData.username
//    * @param {string=} authData.token
//    * @param {number=} authData.expire
//    * @param {string=} authData.key
//    * @param {string} keyType
//    * @param {Array} ops
//    */
//   broadcast(authData, keyType, ops) {
//     this.assert(authData, 'authData', [['username', 'string'], ['token', 'string'], ['key', 'string']]);
//     this.assert(ops, 'ops', []);

//     this.authKey = authData.key;
//     const data = CryptoJS.AES.encrypt(JSON.stringify({ key_type: keyType, ops, broadcast: false }), authData.key).toString();
//     const payload = { cmd: 'sign_req', account: authData.username, token: authData.token, data };
//     this.send(JSON.stringify(payload));
//     this.currentRequestExpire = new Date().getTime() + this.timeout;
//     this.setExpireTimeout();
//   }
// }
// const client = new EnhancedHasClient('hive-auth.arcange.eu', '', true);

const client = new HasClient('hive-auth.arcange.eu', '', true);

export interface HiveAuthData {
    username: string;
    token: string;
    expire: number;
    key: string;
};

const initialHiveAuthData: HiveAuthData = {
    username: '',
    token: '',
    expire: 0,
    key: '',
};

const auth: HiveAuthData = {
    username: '',
    token: '',
    expire: 0,
    key: '',
};

const setUsername = (username: string) => {
    auth.username = username;
};

const setToken = (token: string) => {
    auth.token = token;
};

const setExpire = (expire: number) => {
    auth.expire = expire;
};

const setKey = (key: string) => {
    auth.key = key;
};

// const isLoggedInWithHiveAuth = () => {
//     if (!isLoggedIn()) {
//         return false;
//     }

//     const now = new Date().getTime();
//     const data = localStorage.getItem('autopost2');
//     const [,,,,,,,, login_with_hiveauth, hiveauth_key, hiveauth_token, hiveauth_token_expires] = extractLoginData(data);
//     return !!login_with_hiveauth
//         && !!hiveauth_key
//         && !!hiveauth_token
//         && now < hiveauth_token_expires;
// };

const verifyChallenge = (challenge: string | Buffer, data: { challenge: string | Buffer | HexBuffer | number[]; pubkey: string | PublicKey; }) => {
    // Validate signature against account public key

    // TODO We should get public key from Hive blockchain and validate
    // against it. We shouldn't trust pubkey coming in data!

    const sig = Signature.fromString(
        HexBuffer.from(data.challenge).toString())
    const buf = cryptoUtils.sha256(challenge);
    const publicKey = PublicKey.from(data.pubkey);
    return publicKey.verify(buf, sig)
};

const updateModalMessage = (message: string) => {
    const instructionsContainer = document.getElementById('hiveauth-instructions');
    if (instructionsContainer) {
        instructionsContainer.innerHTML = message;
    }
};

const broadcast = (
        operations: any[],
        type: string,
        callbackFn: (arg0: { success: boolean; error?: any; }) => void,
        translateFn: (v: string) => string = (v) => v
        ) => {
    const handleSignPending = () => {
        updateModalMessage(translateFn('hiveauthservices.broadcastInstructions'));
    };

    const handleSignSuccess = (message: any) => {
        logger.info('Hive Auth: broadcast successful', message);
        callbackFn({
            success: true,
        });
        removeEventHandlers();
    };

    const handleSignFailure = (error: { error: any; message: any; }) => {
        logger.warn('Hive Auth: broadcast failed', error);
        callbackFn({
            success: false,
            error: error.error || error.message,
        });
        removeEventHandlers();
    };

    const handleSignError = (error: { error: any; message: any; }) => {
        logger.warn('Hive Auth: server returned an error during broadcast', error);
        callbackFn({
            success: false,
            error: error.error || error.message,
        });
        removeEventHandlers();
    };

    const handleRequestExpired = (error: { message: any; }) => {
        logger.error('Hive Auth: broadcast request expired', error.message);
        updateModalMessage(translateFn('hiveauthservices.requestExpired'));

        callbackFn({
            success: false,
            error: translateFn('hiveauthservices.requestExpired'),
        });

        removeEventHandlers();
    };

    const handleAttachFailure = (error: { message: any; }) => {
        logger.error('Hive Auth: lost connection to server and failed re-attaching', error.message);
        clearLoginInstructions();
        callbackFn({
            success: false,
            error: translateFn('hiveauthservices.failedAttaching'),
        });
        removeEventHandlers();
    };

    const removeEventHandlers = () => {
        client.removeEventHandler('SignPending', handleSignPending);
        client.removeEventHandler('SignSuccess', handleSignSuccess);
        client.removeEventHandler('SignFailure', handleSignFailure);
        client.removeEventHandler('SignError', handleSignError);
        client.removeEventHandler('RequestExpired', handleRequestExpired);
        client.removeEventHandler('AttachFailure', handleAttachFailure);
    };

    client.addEventHandler('SignPending', handleSignPending);
    client.addEventHandler('SignSuccess', handleSignSuccess);
    client.addEventHandler('SignFailure', handleSignFailure);
    client.addEventHandler('SignError', handleSignError);
    client.addEventHandler('RequestExpired', handleRequestExpired);
    client.addEventHandler('AttachFailure', handleAttachFailure);
    client.broadcast(auth, type, operations);
};

const signChallenge = (
        data: any,
        keyType = 'posting',
        callbackFn: (arg0: { result?: any; success: boolean; error?: string; }) => void,
        translateFn: (v: string) => string = (v) => v
        ) => {
    const handleChallengePending = () => {
        updateModalMessage(translateFn('hiveauthservices.broadcastInstructions'));
    };

    const handleChallengeSuccess = (e: { data: { challenge: any; }; }) => {
        logger.info('Hive Auth: challenge success', e);
        callbackFn({
            result: e.data.challenge,
            success: true,
        });
        removeEventHandlers();
    };

    const handleChallengeFailure = (e: any) => {
        logger.error('Hive Auth: challenge failure', e);
        callbackFn({
            success: false,
            error: translateFn('hiveauthservices.userRejectedRequest'),
        });
        removeEventHandlers();
    };

    const handleChallengeError = (e: any) => {
        logger.error('Hive Auth: challenge error', e);
        callbackFn({
            success: false,
            error: translateFn('hiveauthservices.challengeError'),
        });
        removeEventHandlers();
    };

    const handleRequestExpired = (error: { message: any; }) => {
        logger.error('Hive Auth: challenge request expired', error.message);
        updateModalMessage(translateFn('hiveauthservices.requestExpired'));

        callbackFn({
            success: false,
            error: translateFn('hiveauthservices.requestExpired'),
        });

        removeEventHandlers();
    };

    const removeEventHandlers = () => {
        client.removeEventHandler('ChallengePending', handleChallengePending);
        client.removeEventHandler('ChallengeSuccess', handleChallengeSuccess);
        client.removeEventHandler('ChallengeFailure', handleChallengeFailure);
        client.removeEventHandler('ChallengeError', handleChallengeError);
    };

    client.addEventHandler('ChallengePending', handleChallengePending);
    client.addEventHandler('ChallengeSuccess', handleChallengeSuccess);
    client.addEventHandler('ChallengeFailure', handleChallengeFailure);
    client.addEventHandler('ChallengeError', handleChallengeError);
    client.addEventHandler('RequestExpired', handleRequestExpired);
    client.challenge(auth, {
        key_type: keyType,
        challenge: data,
    });
};

const updateLoginInstructions = (message: string) => {
    const instructionsElement = document.getElementById('hiveauth-instructions');
    if (instructionsElement) {
        instructionsElement.innerHTML = message;
        instructionsElement.classList.remove('hidden');
    }
};

const clearLoginInstructions = () => {
    updateLoginInstructions('');
    const qrElement = document.getElementById('hiveauth-qr') as HTMLCanvasElement;
    if (qrElement) {
        const context = qrElement.getContext('2d');
        if (context) {
            context.clearRect(0, 0, qrElement.width, qrElement.height)
        }
    }
    const qrLinkElement = document.getElementById('hiveauth-qr-link') as HTMLAnchorElement;
    qrLinkElement.href = '#';
    qrLinkElement.classList.add('hidden');

};

const login = async (
        username: string,
        challenge: string,
        callbackFn: (arg0: { success: boolean; error?: string; hiveAuthData?: { key: string; token: string; expire: number; uuid: string; challengeHex: any; }; }) => void,
        translateFn: (v: string) => string = (v) => v
        ) => {
    updateLoginInstructions(translateFn('hiveauthservices.connecting'));

    setUsername(username);

    const challengeData = {
        key_type: 'posting',
        challenge,
    };

    logger.info('Hive Auth: requesting authentication');

    const handleAuthPending = (message: { account: string; expire: number; key: string; uuid: string; }) => {
        const {
            account, expire, key, uuid,
        } = message;
        const now = new Date().getTime();
        if (now < expire) {
            const authPayload = {
                uuid,
                account,
                key,
                host: 'wss://hive-auth.arcange.eu',
            };
            setKey(key);
            const authUri = `has://auth_req/${btoa(JSON.stringify(authPayload))}`;
            logger.info('Hive Auth: Generating QR code');
            const qrElement = document.getElementById('hiveauth-qr');
            if (qrElement) {
                QRCode.toCanvas(qrElement, authUri, function (error) {
                    if (error) logger.error(error)
                })
            }
            const qrLinkElement = document.getElementById('hiveauth-qr-link') as HTMLAnchorElement;
            if (qrLinkElement) {
                qrLinkElement.href = authUri;
                qrLinkElement.classList.remove('hidden');
            }
            updateLoginInstructions(translateFn('hiveauthservices.qrInstructions'));
        } else {
            logger.warn('Hive Auth: token expired');
            clearLoginInstructions();
            callbackFn({
                success: false,
                error: translateFn('hiveauthservices.tokenExpired'),
            });
        }
    };

    const handleAuthSuccess = (message: { data: any; uuid: string; authData: { token: string; key: string; expire: number; }; }) => {
        const {
            data, uuid, authData: { token, key, expire },
        } = message;
        const { challenge: challengeResponse } = data;

        auth.token = token;
        auth.key = key;
        auth.expire = expire;

        logger.info('Hive Auth: user has approved the auth request',
            {challengeResponse, message, auth});
        const verified = verifyChallenge(challenge, challengeResponse);

        if(verified) {
            logger.info("Hive Auth: challenge succeeded");
            callbackFn({
                success: true,
                hiveAuthData: {
                    key: auth.key,
                    token,
                    expire,
                    uuid,
                    challengeHex: challengeResponse.challenge,
                }
            });
        } else {
            logger.error("Hive Auth: challenge failed");
            clearLoginInstructions();
            callbackFn({
                success: false,
                error: translateFn('hiveauthservices.challengeValidationFailed'),
            });
        }

        removeEventHandlers();
    };

    const handleAuthFailure = (message: { uuid: string; }) => {
        const { uuid } = message;
        logger.warn('Hive Auth: user has rejected the auth request', uuid);
        clearLoginInstructions();
        callbackFn({
            success: false,
            error: translateFn('hiveauthservices.userRejectedRequest'),
        });
        removeEventHandlers();
    };

    const handleRequestExpired = (error: { message: any; }) => {
        logger.error('Hive Auth: authentication request expired', error.message);
        clearLoginInstructions();
        updateModalMessage(translateFn('hiveauthservices.requestExpired'));

        callbackFn({
            success: false,
            error: translateFn('hiveauthservices.requestExpired'),
        });

        removeEventHandlers();
    };

    const handleAttachFailure = (error: { message: any; }) => {
        logger.error('Hive Auth: lost connection to server and failed re-attaching', error.message);
        clearLoginInstructions();
        callbackFn({
            success: false,
            error: translateFn('hiveauthservices.failedAttaching'),
        });
        removeEventHandlers();
    };

    const removeEventHandlers = () => {
        client.removeEventHandler('AuthPending', handleAuthPending);
        client.removeEventHandler('AuthSuccess', handleAuthSuccess);
        client.removeEventHandler('AuthFailure', handleAuthFailure);
        client.removeEventHandler('RequestExpired', handleRequestExpired);
        client.removeEventHandler('AttachFailure', handleAttachFailure);
    };

    client.addEventHandler('AuthPending', handleAuthPending);
    client.addEventHandler('AuthSuccess', handleAuthSuccess);
    client.addEventHandler('AuthFailure', handleAuthFailure);
    client.addEventHandler('RequestExpired', handleRequestExpired);
    client.addEventHandler('AttachFailure', handleAttachFailure);

    client.authenticate(
        auth,
        {
            name: 'Hive Blog',
            description: 'Hive Blog',
            icon: `${window.location.origin}/smart-signer/images/hive-blog-twshare.png`
        },
        challengeData
    );
};

const logout = () => {
    auth.username = '';
    auth.token = '';
    auth.expire = 0;
    auth.key = '';
};

const HiveAuthUtils = {
    login,
    logout,
    setUsername,
    setKey,
    setToken,
    setExpire,
    // isLoggedInWithHiveAuth,
    broadcast,
    signChallenge,
    initialHiveAuthData,
};

export default HiveAuthUtils;
