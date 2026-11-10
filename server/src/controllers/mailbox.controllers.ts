import { Request, Response } from 'express';
import { google } from 'googleapis';
import Mailbox, { IMailbox } from '../models/mailbox.models';
import User from '../models/user.models';
import { AuthenticatedRequest } from '../types/types';
import handleError, { handleErrorUtil } from '../utils/errors.utils';

const filePath = '/src/controllers/mailbox.controllers.ts';

const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;

/**
 * GET /user/mailboxes
 * List all connected mailboxes for the authenticated Plum user
 */
export const getMailboxes = async (req: Request, res: Response) => {
    try {
        const userEmail = (req as AuthenticatedRequest).user?.email;
        if (!userEmail) {
            return res.status(401).json({ error: 'Unauthorized', success: false });
        }

        const mailboxes = await Mailbox.find({ userEmail }).sort({ isPrimary: -1, createdAt: 1 });

        const formatted = mailboxes.map((m) => {
            const hasTokens = Boolean(m.tokens?.access_token || m.tokens?.refresh_token);
            let tokenHealth: 'valid' | 'expiring_soon' | 'expired' | 'offline_permanent' = 'offline_permanent';
            let expiresInSeconds: number | null = null;

            if (m.tokens?.expiry_date) {
                const now = Date.now();
                expiresInSeconds = Math.round((m.tokens.expiry_date - now) / 1000);
                if (expiresInSeconds <= 0) {
                    tokenHealth = m.tokens.refresh_token ? 'valid' : 'expired';
                } else if (expiresInSeconds < 300) {
                    tokenHealth = 'expiring_soon';
                } else {
                    tokenHealth = 'valid';
                }
            } else if (m.tokens?.refresh_token) {
                tokenHealth = 'offline_permanent';
            }

            return {
                id: (m as any)._id.toString(),
                email: m.email,
                name: m.name || m.email.split('@')[0],
                picture: m.picture || '',
                isPrimary: m.isPrimary,
                status: m.status,
                lastSyncAt: m.lastSyncAt,
                hasRefreshToken: Boolean(m.tokens?.refresh_token),
                expiryDate: m.tokens?.expiry_date || null,
                expiresInSeconds,
                tokenHealth,
                createdAt: m.createdAt,
            };
        });

        return res.status(200).json({
            mailboxes: formatted,
            count: formatted.length,
            success: true,
        });
    } catch (err) {
        return handleError(filePath, 'getMailboxes', res, err, 'Fetching user mailboxes');
    }
};

/**
 * GET /user/mailboxes/:id/status
 * Live check of mailbox token validity and health
 */
export const getMailboxStatus = async (req: Request, res: Response) => {
    try {
        const userEmail = (req as AuthenticatedRequest).user?.email;
        const { id } = req.params;

        const mailbox = await Mailbox.findOne({ _id: id, userEmail });
        if (!mailbox) {
            return res.status(404).json({ error: 'Mailbox not found', success: false });
        }

        const oauth2Client = new google.auth.OAuth2(clientID, clientSecret, redirectUri);
        oauth2Client.setCredentials({
            access_token: mailbox.tokens.access_token,
            refresh_token: mailbox.tokens.refresh_token,
            id_token: mailbox.tokens.id_token,
            expiry_date: mailbox.tokens.expiry_date,
        });

        let isLive = true;
        let tokenInfo = null;

        try {
            if (mailbox.tokens.access_token) {
                tokenInfo = await oauth2Client.getTokenInfo(mailbox.tokens.access_token);
            }
        } catch (tokenErr) {
            // If access token is expired, attempt refresh
            if (mailbox.tokens.refresh_token) {
                try {
                    const refreshed = await oauth2Client.refreshAccessToken();
                    mailbox.tokens.access_token = refreshed.credentials.access_token || mailbox.tokens.access_token;
                    mailbox.tokens.expiry_date = refreshed.credentials.expiry_date || mailbox.tokens.expiry_date;
                    mailbox.status = 'connected';
                    await mailbox.save();
                    isLive = true;
                } catch (refreshErr) {
                    isLive = false;
                    mailbox.status = 'expired';
                    await mailbox.save();
                }
            } else {
                isLive = false;
                mailbox.status = 'expired';
                await mailbox.save();
            }
        }

        return res.status(200).json({
            id: mailbox._id,
            email: mailbox.email,
            status: mailbox.status,
            isLive,
            hasRefreshToken: Boolean(mailbox.tokens?.refresh_token),
            expiryDate: mailbox.tokens?.expiry_date || null,
            scopes: tokenInfo?.scopes || [],
            success: true,
        });
    } catch (err) {
        return handleError(filePath, 'getMailboxStatus', res, err, 'Checking mailbox status');
    }
};

/**
 * GET /user/mailboxes/connect-url
 * Returns the OAuth URL to link a new Gmail mailbox or reauthorize an existing one
 */
export const getConnectUrl = async (req: Request, res: Response) => {
    try {
        const userEmail = (req as AuthenticatedRequest).user?.email || (req.query.userEmail as string) || '';
        const targetMailbox = (req.query.mailboxEmail as string) || '';
        const action = targetMailbox ? 'reauthorize_mailbox' : (userEmail ? 'connect_mailbox' : 'login');

        const oauth2Client = new google.auth.OAuth2(clientID, clientSecret, redirectUri);
        const statePayload = JSON.stringify({
            userEmail,
            targetMailbox,
            action,
            timestamp: Date.now(),
        });

        const authUrlOptions: any = {
            access_type: 'offline',
            prompt: 'consent',
            scope: [
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.send',
                'https://www.googleapis.com/auth/gmail.modify',
                'email',
                'profile',
                'openid',
            ],
            state: Buffer.from(statePayload).toString('base64'),
        };

        if (targetMailbox) {
            authUrlOptions.login_hint = targetMailbox;
        }

        const authUrl = oauth2Client.generateAuthUrl(authUrlOptions);

        return res.status(200).json({
            authUrl,
            action,
            targetMailbox,
            success: true,
        });
    } catch (err) {
        return handleError(filePath, 'getConnectUrl', res, err, 'Generating connect URL');
    }
};

/**
 * GET /user/mailboxes/connect
 * Direct HTTP 302 redirect to Google OAuth to bypass any client-side CORS/preflight issues
 */
export const redirectToConnect = async (req: Request, res: Response) => {
    try {
        const userEmail = (req as AuthenticatedRequest).user?.email || (req.query.userEmail as string) || '';
        const targetMailbox = (req.query.mailboxEmail as string) || '';
        const action = targetMailbox ? 'reauthorize_mailbox' : (userEmail ? 'connect_mailbox' : 'login');

        const oauth2Client = new google.auth.OAuth2(clientID, clientSecret, redirectUri);
        const statePayload = JSON.stringify({
            userEmail,
            targetMailbox,
            action,
            timestamp: Date.now(),
        });

        const authUrlOptions: any = {
            access_type: 'offline',
            prompt: 'consent',
            scope: [
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.send',
                'https://www.googleapis.com/auth/gmail.modify',
                'email',
                'profile',
                'openid',
            ],
            state: Buffer.from(statePayload).toString('base64'),
        };

        if (targetMailbox) {
            authUrlOptions.login_hint = targetMailbox;
        }

        const authUrl = oauth2Client.generateAuthUrl(authUrlOptions);
        return res.redirect(authUrl);
    } catch (err) {
        return res.redirect('https://plum.com/accounts?error=oauth_init_failed');
    }
};

/**
 * POST /user/mailboxes/:id/refresh
 * Explicitly attempt to refresh the Google access token for a mailbox
 */
export const refreshMailboxToken = async (req: Request, res: Response) => {
    try {
        const userEmail = (req as AuthenticatedRequest).user?.email;
        const { id } = req.params;

        const mailbox = await Mailbox.findOne({ _id: id, userEmail });
        if (!mailbox) {
            return res.status(404).json({ error: 'Mailbox not found', success: false });
        }

        const oauth2Client = new google.auth.OAuth2(clientID, clientSecret, redirectUri);
        oauth2Client.setCredentials({
            refresh_token: mailbox.tokens.refresh_token,
            access_token: mailbox.tokens.access_token,
        });

        try {
            if (!mailbox.tokens.refresh_token) {
                throw new Error('No refresh token present');
            }

            const refreshed = await oauth2Client.refreshAccessToken();
            const newAccessToken = refreshed.credentials.access_token;
            const newExpiryDate = refreshed.credentials.expiry_date;

            mailbox.tokens.access_token = newAccessToken || mailbox.tokens.access_token;
            mailbox.tokens.expiry_date = newExpiryDate || mailbox.tokens.expiry_date;
            mailbox.status = 'connected';
            await mailbox.save();

            // Also update any matching User records or other mailbox references
            await Mailbox.updateMany(
                { email: mailbox.email },
                {
                    $set: {
                        'tokens.access_token': newAccessToken,
                        'tokens.expiry_date': newExpiryDate,
                        status: 'connected',
                    }
                }
            );

            await User.updateOne(
                { email: mailbox.email },
                {
                    $set: {
                        'google.accessToken': newAccessToken,
                    }
                }
            );

            return res.status(200).json({
                message: `Tokens successfully refreshed for ${mailbox.email}`,
                email: mailbox.email,
                isRefreshed: true,
                status: 'connected',
                expiryDate: newExpiryDate,
                success: true,
            });
        } catch (refreshErr: any) {
            // Refresh token is revoked or expired (e.g. invalid_grant)
            mailbox.status = 'expired';
            await mailbox.save();

            // Generate direct reauthorization URL for the user
            const statePayload = JSON.stringify({
                userEmail,
                targetMailbox: mailbox.email,
                action: 'reauthorize_mailbox',
                timestamp: Date.now(),
            });

            const authUrl = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                prompt: 'consent',
                login_hint: mailbox.email,
                scope: [
                    'https://www.googleapis.com/auth/gmail.readonly',
                    'https://www.googleapis.com/auth/gmail.send',
                    'https://www.googleapis.com/auth/gmail.modify',
                    'email',
                    'profile',
                    'openid',
                ],
                state: Buffer.from(statePayload).toString('base64'),
            });

            return res.status(200).json({
                message: `Google refresh token expired for ${mailbox.email}. Please reauthorize with Google.`,
                email: mailbox.email,
                isRefreshed: false,
                needsReauthorization: true,
                authUrl,
                status: 'expired',
                success: false,
            });
        }
    } catch (err) {
        return handleError(filePath, 'refreshMailboxToken', res, err, 'Refreshing mailbox token');
    }
};

/**
 * DELETE /user/mailboxes/:id
 * Disconnect a mailbox
 */
export const disconnectMailbox = async (req: Request, res: Response) => {
    try {
        const userEmail = (req as AuthenticatedRequest).user?.email;
        const { id } = req.params;

        const mailbox = await Mailbox.findOne({ _id: id, userEmail });
        if (!mailbox) {
            return res.status(404).json({ error: 'Mailbox not found', success: false });
        }

        const wasPrimary = mailbox.isPrimary;
        await Mailbox.deleteOne({ _id: id, userEmail });

        // If the disconnected mailbox was primary, promote another mailbox to primary if one exists
        if (wasPrimary) {
            const nextMailbox = await Mailbox.findOne({ userEmail });
            if (nextMailbox) {
                nextMailbox.isPrimary = true;
                await nextMailbox.save();
            }
        }

        return res.status(200).json({
            message: `Mailbox ${mailbox.email} disconnected successfully`,
            disconnectedEmail: mailbox.email,
            success: true,
        });
    } catch (err) {
        return handleError(filePath, 'disconnectMailbox', res, err, 'Disconnecting mailbox');
    }
};

/**
 * POST /user/mailboxes/:id/primary
 * Set a mailbox as primary
 */
export const setPrimaryMailbox = async (req: Request, res: Response) => {
    try {
        const userEmail = (req as AuthenticatedRequest).user?.email;
        const { id } = req.params;

        const target = await Mailbox.findOne({ _id: id, userEmail });
        if (!target) {
            return res.status(404).json({ error: 'Mailbox not found', success: false });
        }

        await Mailbox.updateMany({ userEmail }, { $set: { isPrimary: false } });
        target.isPrimary = true;
        await target.save();

        return res.status(200).json({
            message: `Mailbox ${target.email} is now primary`,
            primaryEmail: target.email,
            success: true,
        });
    } catch (err) {
        return handleError(filePath, 'setPrimaryMailbox', res, err, 'Setting primary mailbox');
    }
};

const mailboxControllers = {
    getMailboxes,
    getMailboxStatus,
    getConnectUrl,
    redirectToConnect,
    refreshMailboxToken,
    disconnectMailbox,
    setPrimaryMailbox,
};

export default mailboxControllers;
