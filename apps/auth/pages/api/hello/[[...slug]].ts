import type { NextApiRequest, NextApiResponse } from 'next';
import { oidc } from '@/auth/lib/oidc';

type ResponseData = {
    message: string
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ResponseData>
) {
    const { slug } = req.query;
    try {
        if (slug) {
            const {
                uid, prompt, params, session, returnTo,
            } = await oidc.interactionDetails(req, res);
            console.info('api loginUser : %o', {
                slug, uid, prompt, params, session, returnTo,
            });
        } else {
            console.info('api loginUser: no slug');
        }
    } catch (e) {
        throw e;
    }

    res.status(200).json({ message: 'Hello from Next.js!' });
}
