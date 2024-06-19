import Provider, { Configuration } from 'oidc-provider';
import { siteConfig } from '@ui/config/site';
import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('app');

//
// For example configuration see
//
// 1. https://github.com/panva/node-oidc-provider/tree/main/docs
// 2. https://github.com/ebrahimmfadae/openid-connect-app
//

const configuration: Configuration = {
    clients: [{
        client_id: 'foo',
        client_secret: 'bar',
        redirect_uris: ['https://oidcdebugger.com/debug'],
        grant_types: ["authorization_code"],
        scope: "openid",
    }],
    cookies: {
        keys: ['secret-devel-key'],
    },
    features: {
        devInteractions: { enabled: false },
    },
    interactions: {
        async url(ctx, interaction) {
            logger.info('interaction: %o', interaction);
            if (interaction.prompt.name === 'login') {
                return `/interaction/${interaction.uid}/login`;
            } else if (interaction.prompt.name === 'consent') {
                return `/interaction/${interaction.uid}/consent`;
            }
            return `/interaction/${interaction.uid}`;
        },
    },
    jwks: {
        "keys": [
            {
                "alg": "RS256",
                "d": "JLmMBe2FLi605UnPc5LQY3gtnGJpfjbzhTufA9Dyx2wzF1yqDTPHfPgOL3h7sskeaIsfKxZeqoQF-9olJWxAwWOSUWo7NgT3V4yyFWKOQ1CMzGu03I2j7wjmPJ6aijbCR7NuXrhUH_DLdXCuaSXUUzdJl9Qy69PG1_81_uKxyYSwszAWWfxFCmDIW6Jqz1uvYaoGcjA9S_u9vWljnXLRrsT1HAFJErEnkmtWDhKZuOTcoIpsleXrWIHfgTb442bIHhe-JvmnsL-4icYDSBdWYT5DYt_T6dxqYmZu_9g_J_m6X6F1ATWJliRNnelyZGaFc_5SfGzAwpf7qvojJrz2iQ",
                "dp": "w4ifplCXM5Ssnkn-wXBAI2lwKCq97o18K5tde9HQuZLRVFI6OYlr8XMkqn7Wz6PGYQnl-RDel7bAy-sWcAE_Lm_0t_zSaf35dc48vanMhwhpE1vmzjEeGsIseQDBhQfOYGqEgmoheW7ltaI21U1DScIKSzOywx0TdHPHTljP3nE",
                "dq": "J0pkhMIbIDodpWbsaMKZBRVfMmdrAOEvQfEBtb_qBxjv_JUG15IXPlZIlCBr97RmDDHRh3hxtT_NYKwL26aPXU6r4Y4PLvqZv4vl9E05ZYlbtZA39H1D2mNhKSCVL1k9yX-j2DCsXFlLuLVMsoSYTK3r4klJie9vPdqBV2GMYnk",
                "e": "AQAB",
                "kid": "676da9d312c39a429942f543e6c1b6512e4983",
                "kty": "RSA",
                "n": "lKcKuj_U7On98cfx6xHx9s6LLfazd7bKKmRnxrMOWL-Lr3w4QRuqMDeUORbViQR2OzCdc6bqXk8otkYvpfYSxzIBoNtHxXAbhQ1i5pHeemRXCl1GaV_GxiDQCW_R2BTQv1fdP884RskkKf81Ay6OSUNicVTvITsAnPGAPyEinT2YRTpX0Zi1jQDKSD6OSwZb2tvHI3wOcksTSTJNmYV0ZPYe_n21B55OAHNgegQLJbnWUPwEJ_kU73h8IAsxDmiZ2Zz4BLElBu7UoviJtgiHot23tYYUNVQ1Lhe6l0oDcqXY7ceQWIOHqSXMCQ11io8HBFb00BfPi2MaLURFUgJhgw",
                "p": "x2UDhFvUXAOiMlf4x6wBi0-Z15rQ7Bzp789YF4PFOD4elqW7cCs7niqAosnQ7VIQfoLnZReQX69IttV7xB8ZOJuFeQ0fZldL127DKpV2f8XP5YHA2Uw52m4xBf7tNLJWvd1RIs8NcinWXlMgMwC4JydCgq1AGEgbuuDdi3bnKDU",
                "q": "vtpZ_13h1lswCJZPYc_qSZbjYfTer9tEvvYgddKcBm59B-mZeYdNMfgWDkmfKHW_zXM-fM_T76KLgeLxCuYtJ_XaNSojAhVD0Q0VLdN7FMWosrxULtn7cIpZ8oYAdD58EUFy1CQ2ltajN1khKdf63PpRhGLj50auqb0LMU_Wydc",
                "qi": "O_mUvxORWERaEzD5VphSt50_4ljKkyinCrymXzyIqr4plH6H-xZJWq21QtiFHDZjLHS3NXLzGLmeoIgugjnRrJpJM00rMqrE57YTuG7S_Oo7ubnfms7w81z1cNrkS8Coi37CG2AK3q8P4DOPzE4nogmsQLKqbNbOPsqNSwOcpJs",
                "use": "sig"
            }
        ]
    },
    routes: {
        authorization: '/oidc/auth',
        backchannel_authentication: '/oidc/backchannel',
        code_verification: '/oidc/device',
        device_authorization: '/oidc/device/auth',
        end_session: '/oidc/session/end',
        introspection: '/oidc/token/introspection',
        jwks: '/oidc/jwks',
        pushed_authorization_request: '/oidc/request',
        registration: '/oidc/reg',
        revocation: '/oidc/token/revocation',
        token: '/oidc/token',
        userinfo: '/oidc/me'
    }
};

const oidcInstance = new Provider(`${siteConfig.url}/oidc`, configuration);
oidcInstance.proxy = true;
export const oidc = oidcInstance;
