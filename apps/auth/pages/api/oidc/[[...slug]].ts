import { NextApiRequest, NextApiResponse } from 'next';
import { oidc } from '@angala/lib/oidc';

async function oidcRoute(req: NextApiRequest, res: NextApiResponse) {
  // req.url = req.url ? req.url.replace('/api/oidc', '') : req.url;
  const result = await oidc.callback()(req, res);
}

export default oidcRoute;
