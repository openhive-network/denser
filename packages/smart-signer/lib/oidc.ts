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
