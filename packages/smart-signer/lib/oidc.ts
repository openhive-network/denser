import Provider, { Configuration, errors } from 'oidc-provider';
import { siteConfig } from '@ui/config/site';
import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('app');

/**
 * Configuration and initialization for
 * [node-oidc-provider](https://github.com/panva/node-oidc-provider)
 * module. This is OAuth 2.0 (RFC 6749) Authorization Server with
 * support for OpenID Connect (OIDC). For documentation and example
 * configuration see:
 * 1. https://github.com/panva/node-oidc-provider/tree/main/docs
 * 2. https://github.com/ebrahimmfadae/openid-connect-app
 */

const corsOrigins = 'urn:custom:client:allowed-cors-origins';
const isOrigin = (value: string): boolean => {
    if (typeof value !== 'string') {
        return false;
    }
    try {
        const { origin } = new URL(value);
        // Origin: <scheme> "://" <hostname> [ ":" <port> ]
        return value === origin;
    } catch (err) {
        return false;
    }
}

const configuration: Configuration = {
    clients: JSON.parse(siteConfig.oidcClients),
    cookies: {
        keys: siteConfig.oidcCookiesKeys,
        names: {
            session: 'oidc_session',
            interaction: 'oidc_interaction',
            resume: 'oidc_resume',
        },
    },
    findAccount: async (ctx, sub, token) => {
        // @param ctx - koa request context
        // @param sub {string} - account identifier (subject)
        // @param token - is a reference to the token used for which a given account is being loaded,
        //   is undefined in scenarios where claims are returned from authorization endpoint
        return {
          accountId: sub,
          // @param use {string} - can either be "id_token" or "userinfo", depending on
          //   where the specific claims are intended to be put in
          // @param scope {string} - the intended scope, while oidc-provider will mask
          //   claims depending on the scope automatically you might want to skip
          //   loading some claims from external resources or through db projection etc. based on this
          //   detail or not return them in ID Tokens but only UserInfo and so on
          // @param claims {object} - the part of the claims authorization parameter for either
          //   "id_token" or "userinfo" (depends on the "use" param)
          // @param rejected {Array[String]} - claim names that were rejected by the end-user, you might
          //   want to skip loading some claims from external resources or through db projection
          async claims(use, scope, claims, rejected) {
            return { sub };
          },
        };
    },
    features: {
        devInteractions: { enabled: false },
        // jwtResponseModes: { enabled: true },
        // resourceIndicators: {
        //     enabled: true,
        //     defaultResource: (ctx, client, oneOf) => {
        //         if (oneOf) return oneOf;
        //         return client['access_token_type'] === 'opaque' ? undefined : `https://yogi.com`;
        //     },
        //     getResourceServerInfo: (ctx, resourceIndicator, client) => {
        //         return {
        //             scope: 'openid',
        //             audience: 'resource-server-audience-value',
        //             accessTokenTTL: 60, // q minute
        //             accessTokenFormat: 'jwt',
        //             jwt: {
        //               sign: { alg: 'ES256' },
        //             },
        //           }
        //     },
        //     useGrantedResource: (ctx, model) => {
        //         // @param ctx - koa request context
        //         // @param model - depending on the request's grant_type this can be either an AuthorizationCode, BackchannelAuthenticationRequest,
        //         //                RefreshToken, or DeviceCode model instance.
        //         return false;
        //     }
        // },
    },
    interactions: {
        async url(ctx, interaction) {
            if (interaction.prompt.name === 'login') {
                return `${siteConfig.oidcInteractionUrlPrefix}/${interaction.uid}/login`;
            } else if (interaction.prompt.name === 'consent') {
                return `${siteConfig.oidcInteractionUrlPrefix}/${interaction.uid}/consent`;
            }
            return `${siteConfig.oidcInteractionUrlPrefix}/${interaction.uid}`;
        },
    },
    pkce: {
        required: (ctx, client) => {
            if (['foo', 'openhive_chat'].includes(client.clientId)) {
                return false;
            }
            return true;
        },
    },
    jwks: {
        "keys": JSON.parse(siteConfig.oidcJwksKeys),
    },
    routes: {
        authorization: `${siteConfig.oidcUrlPrefix}/auth`,
        backchannel_authentication: `${siteConfig.oidcUrlPrefix}/backchannel`,
        code_verification: `${siteConfig.oidcUrlPrefix}/device`,
        device_authorization: `${siteConfig.oidcUrlPrefix}/device/auth`,
        end_session: `${siteConfig.oidcUrlPrefix}/session/end`,
        introspection: `${siteConfig.oidcUrlPrefix}/token/introspection`,
        jwks: `${siteConfig.oidcUrlPrefix}/jwks`,
        pushed_authorization_request: `${siteConfig.oidcUrlPrefix}/request`,
        registration: `${siteConfig.oidcUrlPrefix}/reg`,
        revocation: `${siteConfig.oidcUrlPrefix}/token/revocation`,
        token: `${siteConfig.oidcUrlPrefix}/token`,
        userinfo: `${siteConfig.oidcUrlPrefix}/me`
    },
    extraClientMetadata: {
        properties: [corsOrigins],
        validator(ctx, key, value, metadata) {
            if (key === corsOrigins) {
                // set default (no CORS)
                if (value === undefined) {
                    metadata[corsOrigins] = [];
                    return;
                }
                // validate an array of Origin strings
                if (!Array.isArray(value) || !value.every(isOrigin)) {
                    throw new errors.InvalidClientMetadata(`${corsOrigins} must be an array of origins`);
                }
            }
        },
    },
    clientBasedCORS: function (ctx, origin, client) {
        // ctx.oidc.route can be used to exclude endpoints from this
        // behaviour, in that case just return true to always allow CORS
        // on them, false to deny you may also allow some known internal
        // origins if you want to
        return (client[corsOrigins] as string[]).includes(origin);
    }
};

let oidcInstance: Provider | null;
if (siteConfig.oidcEnabled) {
    logger.info('OIDC server enabled');
    oidcInstance = new Provider(
        `${siteConfig.url}${siteConfig.oidcUrlPrefix}`,
        configuration
    );
    oidcInstance.proxy = true; // trust X-Forwarded-*
} else {
    logger.info('OIDC server disabled');
    oidcInstance = null;
}

export const oidc = oidcInstance;
