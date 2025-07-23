import type { NextApiRequest, NextApiResponse } from 'next';
import { logLoginEvent } from '@hive/ui/lib/logging';

function getClientIp(req: NextApiRequest) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { username, loginType, loginChallenge, authProof } = req.body;
    const ip = getClientIp(req);

    // Log the login event with the serialized auth proof
    logLoginEvent(ip, username, loginType, loginChallenge, authProof);

    res.status(200).json({ success: true });
} 