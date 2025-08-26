import type { NextApiRequest, NextApiResponse } from 'next';
import {
    AUTH_PROOF_COOKIE_NAME,
    parseAuthProofCookie,
    setAuthProofCookie,
    logLogoutAndKeepCookie,
    AuthProofCookieData,
    parseAuthProofTransaction,
    logLoginEvent
} from './auth-proof-cookie';
import { getClientIp } from './common-utils';

export async function handleLogAccount(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { type, username, authProof } = req.body;
    const ip = getClientIp(req);

    if (type === 'logout') {
        // Handle logout event - get data from existing cookie to preserve UUID
        try {
            const existingCookie = req.cookies[AUTH_PROOF_COOKIE_NAME];
            if (existingCookie) {
                // Parse existing cookie to get the UUID and user details
                const cookieData = parseAuthProofCookie(existingCookie);
                if (cookieData) {
                    // Log logout event and keep cookie for tracking
                    logLogoutAndKeepCookie(req, res, cookieData.username || 'none', cookieData.loginType || 'none', cookieData.uuid, ip);

                    res.status(200).json({ success: true, action: 'logout', uuid: cookieData.uuid });
                    return;
                }
            }
        } catch (error) {
            console.error('Error parsing existing cookie for logout:', error);
        }

        // Fallback: if no cookie or parsing failed
        res.status(400).json({ error: 'No valid auth cookie found for logout' });
        return;
    }

    // Handle login event (default behavior)
    if (!username || !authProof) {
        res.status(400).json({ error: 'Missing required fields for login' });
        return;
    }

    // Parse authProof transaction to get loginChallenge and loginType
    const parsedData = await parseAuthProofTransaction(authProof);
    if (!parsedData) {
        res.status(400).json({ error: 'Invalid auth proof transaction' });
        return;
    }

    const { loginChallenge, loginType } = parsedData;

    // Log the login event using parsed data
    logLoginEvent(ip, username, loginType, loginChallenge);

    // Check if we need to set/update the cookie
    const existingCookie = req.cookies[AUTH_PROOF_COOKIE_NAME];
    let shouldSetCookie = true;
    let cookieData: AuthProofCookieData;

    if (existingCookie) {
        try {
            const existingData = parseAuthProofCookie(existingCookie);
            if (existingData) {
                // Check if username or loginType changed
                if (existingData.username === username && existingData.loginType === loginType) {
                    // Same user and login type, no need to update cookie
                    shouldSetCookie = false;
                    cookieData = existingData;
                } else {
                    // Different user or login type, update cookie but keep same UUID
                    cookieData = {
                        uuid: existingData.uuid, // Keep same UUID
                        username,
                        loginType,
                        authProof,
                        timestamp: Date.now()
                    };
                }
            } else {
                // Invalid existing cookie, create new one
                cookieData = {
                    uuid: loginChallenge,
                    username,
                    loginType,
                    authProof,
                    timestamp: Date.now()
                };
            }
        } catch (error) {
            console.error('Error parsing existing cookie:', error);
            // Create new cookie if parsing failed
            cookieData = {
                uuid: loginChallenge,
                username,
                loginType,
                authProof,
                timestamp: Date.now()
            };
        }
    } else {
        // No existing cookie, create new one
        cookieData = {
            uuid: loginChallenge,
            username,
            loginType,
            authProof,
            timestamp: Date.now()
        };
    }

    // Set cookie if needed
    if (shouldSetCookie) {
        setAuthProofCookie(res, cookieData);
    }

    res.status(200).json({
        success: true,
        action: 'login',
        uuid: cookieData.uuid,
        username: cookieData.username,
        loginType: cookieData.loginType
    });
}
