import { NextApiRequest, NextApiResponse } from 'next';
import { oidc } from '@smart-signer/lib/oidc';
import { siteConfig } from '@ui/config/site';

async function oidcRoute(req: NextApiRequest, res: NextApiResponse) {
  if (oidc) {
    // Ensure X-Forwarded headers are set for correct OIDC endpoint URL generation.
    // The external proxy may not forward these headers, causing oidc-provider to
    // generate internal URLs (e.g., http://blog/oidc/auth) instead of public ones.
    // siteConfig.url is loaded from REACT_APP_SITE_DOMAIN at server startup.
    const siteUrl = new URL(siteConfig.url);
    if (!req.headers['x-forwarded-host']) {
      req.headers['x-forwarded-host'] = siteUrl.host;
    }
    if (!req.headers['x-forwarded-proto']) {
      req.headers['x-forwarded-proto'] = siteUrl.protocol.replace(':', '');
    }
    await oidc.callback()(req, res);
  }
  res.status(404).end();
}

export default oidcRoute;
