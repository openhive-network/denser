import { NextApiRequest, NextApiResponse } from 'next';
import { oidc } from '@/auth/lib/oidc';

async function oidcRoute(req: NextApiRequest, res: NextApiResponse) {
  // req.url = req.url ? req.url.replace('/api/oidc', '') : req.url;
  await oidc.callback()(req, res);
}

export default oidcRoute;
