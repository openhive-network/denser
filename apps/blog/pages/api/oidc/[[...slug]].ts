import { NextApiRequest, NextApiResponse } from 'next';
import { oidc } from '@smart-signer/lib/oidc';

async function oidcRoute(req: NextApiRequest, res: NextApiResponse) {
  if (oidc) {
    await oidc.callback()(req, res);
  }
  res.status(404).end();
}

export default oidcRoute;
