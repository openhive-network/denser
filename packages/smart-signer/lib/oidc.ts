import Provider, { Configuration, errors, AccountClaims, ClaimsParameterMember } from 'oidc-provider';
import { siteConfig } from '@ui/config/site';
import { getLogger } from '@hive/ui/lib/logging';
import { getHiveUserProfile } from './get-hive-user-profile';

const logger = getLogger('app');

export interface OidcClientDetails {
  clientId: string;
  clientName: string;
  clientUri: string;
  logoUri: string;
  policyUri: string;
  tosUri: string;
}

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
};

const configuration: Configuration = {
    clients: JSON.parse(siteConfig.oidcClients),
    // clientAuthMethods: ['none'],
    cookies: {
        keys: siteConfig.oidcCookiesKeys,
        names: {
            session: 'oidc_session',
            interaction: 'oidc_interaction',
            resume: 'oidc_resume',
        },
    },
    claims: {
        openid: ['sub'],
        address: ['address'],
        email: ['email', 'email_verified'],
        phone: ['phone_number', 'phone_number_verified'],
        profile: [
          'birthdate', 'family_name', 'gender', 'given_name',
          'locale', 'middle_name', 'name', 'nickname', 'picture',
          'preferred_username', 'profile', 'updated_at', 'website',
          'zoneinfo'
        ],
    },
    // This function works on userinfo endpoint (/oidc/me).
    findAccount: async (ctx, sub, token) => {
        // logger.info('findAccount sub: %s, token: %o', sub, token);
        // @param ctx - koa request context
        // @param sub {string} - account identifier (subject)
        // @param token - is a reference to the token used for which
        //    a given account is being loaded, is undefined in scenarios
        //    where claims are returned from authorization endpoint
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
          claims: async (
            use: string,
            scope: string,
            claims: { [key: string]: ClaimsParameterMember | null; },
            rejected: string[]
          ) => {
            // logger.info('claims args: %o', { use, scope, claims, rejected });
            if (scope.split(' ').includes('profile')) {
              const profile = await getHiveUserProfile(sub);
              return { sub, profile } as AccountClaims;
            }
            return { sub } as AccountClaims;
          },
        };
    },
    features: {
        devInteractions: { enabled: false },
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
    },
    ttl: {
      AccessToken: function AccessTokenTTL(ctx, token, client) {
        // return token.resourceServer?.accessTokenTTL || 60 * 60; // 1 hour in seconds
        return token.resourceServer?.accessTokenTTL || 60 * 2 ;
      },
      AuthorizationCode: 60 /* 1 minute in seconds */,
      BackchannelAuthenticationRequest: function BackchannelAuthenticationRequestTTL(ctx, request, client) {
        if (ctx?.oidc && ctx.oidc.params?.requested_expiry) {
          return Math.min(10 * 60, +ctx.oidc.params.requested_expiry); // 10 minutes in seconds or requested_expiry, whichever is shorter
        }

        return 10 * 60; // 10 minutes in seconds
      },
      ClientCredentials: function ClientCredentialsTTL(ctx, token, client) {
        return token.resourceServer?.accessTokenTTL || 10 * 60; // 10 minutes in seconds
      },
      DeviceCode: 600 /* 10 minutes in seconds */,
      Grant: 1209600 /* 14 days in seconds */,
      // IdToken: 3600 /* 1 hour in seconds */,
      IdToken: 60 * 2,
      Interaction: 3600 /* 1 hour in seconds */,
      RefreshToken: function RefreshTokenTTL(ctx, token, client) {
        if (
          ctx && ctx.oidc.entities.RotatedRefreshToken
          && client.applicationType === 'web'
          && client.clientAuthMethod === 'none'
          && !token.isSenderConstrained()
        ) {
          // Non-Sender Constrained SPA RefreshTokens do not have infinite expiration through rotation
          return ctx.oidc.entities.RotatedRefreshToken.remainingTTL;
        }

        return 14 * 24 * 60 * 60; // 14 days in seconds
      },
      // Session: 1209600 /* 14 days in seconds */
      Session: 1209600 /* 14 days in seconds */
    },
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
