import { Request, Response } from "express";
import axios from "axios";
import handleError, { handleErrorUtil } from "../utils/errors.utils";
import User from "../models/user.models";
import Mailbox from "../models/mailbox.models";
import { UserType } from "../types/types";
import logger from "../utils/logger.utils";
import settingsOps from "./settings.controllers";
import { createAuthTokens } from "../middlewares/auth.middlewares";
import { OAuthObjectCheck } from "../middlewares/googleAuth.middlewares";

const frontendOrigin = process.env.FRONTEND_ORIGIN!;
const filePath = '/src/controllers/user.controllers';

const findUserUtil = async (email: string): Promise<UserType | null> => {
    try {
        const user: UserType | null = await User.findOne({ email });
        return user;
    } catch (err) {
        handleErrorUtil(filePath, 'findUserUtil', err, 'Finding User by Email in DB');
        return null;
    }
};

// POST api.plum.com/user/
const findUser = async (req: Request, res: Response) => {
    try {
        const user = await findUserUtil(req.body.userEmail);
        if (!user) {
            return res.status(404).json({ message: `User with email '${req.body.userEmail}' not found`, success: false });
        }
        return res.status(200).json({ user, success: true });
    } catch (err) {
        handleError(filePath, 'getTokens', res, err, 'Fetching Google Tokens')
    }
};

// GET api.plum.com/user/me
const getMe = async (req: Request, res: Response) => {
    try {
        const email = (req as any).user?.email;
        if (!email) {
            return res.status(401).json({ error: 'Unauthorized', success: false });
        }
        const user = await findUserUtil(email);
        if (!user) {
            return res.status(404).json({ error: 'User not found', success: false });
        }
        return res.status(200).json({
            user: {
                email: user.email,
                name: user.name,
                lastName: user.lastName,
                profilePicture: user.profilePicture,
            },
            success: true
        });
    } catch (err) {
        handleError(filePath, 'getMe', res, err, 'Fetching Current User');
    }
};

// POST api.plum.com/user/logout
const logoutUser = async (req: Request, res: Response) => {
    try {
        res.clearCookie('accessToken', { domain: '.plum.com' });
        res.clearCookie('refreshToken', { domain: '.plum.com' });
        res.clearCookie('gmail', { domain: '.plum.com' });
        res.clearCookie('picture', { domain: '.plum.com' });
        return res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        handleError(filePath, 'logoutUser', res, err, 'Logging out User');
    }
};

/*
 * Google Auth Ops
*/

const createUser = async (res: Response, data: any, tokens: { access_token: string, refresh_token: string, id_token: string, expiry_date?: number }) => {
    try {
        const userCheck = await findUserUtil(data.email);
        if (userCheck) {
            await updateUserGoogleTokens(data.email, tokens);
        } else {
            const user = await User.create({
                email: data.email,
                name: data.given_name,
                lastName: data.family_name,
                profilePicture: data.picture,
                google: {
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    IdToken: tokens.id_token,
                }
            });
            if (!user) throw Error('Failed to create the user named: ' + data.name);
            logger.info('User created with name: ' + data.name);
        }

        // Keep Mailbox collection synchronized for primary account
        const fullName = [data.given_name, data.family_name].filter(Boolean).join(' ') || data.name || data.email;
        await Mailbox.findOneAndUpdate(
            { userEmail: data.email, email: data.email },
            {
                $set: {
                    userEmail: data.email,
                    email: data.email,
                    name: fullName,
                    picture: data.picture || '',
                    tokens: {
                        access_token: tokens.access_token,
                        refresh_token: tokens.refresh_token || undefined,
                        id_token: tokens.id_token,
                        expiry_date: tokens.expiry_date,
                    },
                    status: 'connected',
                    isPrimary: true,
                }
            },
            { upsert: true }
        );
    } catch (err) {
        handleError(filePath, 'createUserUtil', res, err, 'Creating a User');
    }
};

// POST api.plum.com/user/auth/login
const loginUser = async (req: Request, res: Response) => {
    try {
        const { email, fName, lName } = req.body;

        if (!email || !fName || !lName) {
            return res.status(400).json({ message: 'Incomplete credentials submitted', success: false });
        }

        const user: UserType | null = await findUserUtil(email);

        if (!user) {
            return res.status(404).json({ message: `No user with email '${email}' found`, success: false });
        }

        if (user.name !== fName || user.lastName !== lName) {
            return res.status(401).json({ message: `Invalid credentials submitted`, success: false });
        }

        await createAuthTokens(email, res);

        return res.status(200).json({ message: 'Successfully logged in', success: true });
    } catch (err) {
        handleError(filePath, 'loginUser', res, err, 'Logging User');
    }
};

const getGoogleTokensUtil = async (email: string) => {
    try {
        const user = await findUserUtil(email);
        if (!user) throw Error(`User with email '${email}' was not found`);

        return {
            accessToken: user.google?.accessToken,
            refreshToken: user.google?.refreshToken,
            IdToken: user.google?.IdToken,
            success: true
        };
    } catch (err: any) {
        if (err?.message.endsWith('was not found')) {
            handleErrorUtil(filePath, 'getGoogleTokens', err, 'Fetching Google Tokens', 404);
        } else {
            handleErrorUtil(filePath, 'getGoogleTokens', err, 'Fetching Google Tokens');
        }
    }
    return {
        accessToken: undefined,
        refreshToken: undefined,
        IdToken: undefined,
        success: false
    };
};

const updateUserGoogleTokens = async (
    email: string,
    tokens: { access_token: string; refresh_token?: string; id_token?: string }
) => {
    try {
        const updateFields: any = {
            'google.accessToken': tokens.access_token,
        };

        if (tokens.refresh_token) {
            updateFields['google.refreshToken'] = tokens.refresh_token;
        }
        if (tokens.id_token) {
            updateFields['google.IdToken'] = tokens.id_token;
        }

        const updatedUser = await User.updateOne(
            { email },
            { $set: updateFields }
        );

        if (updatedUser.modifiedCount === 0) {
            throw new Error('User was not updated');
        }
    } catch (err) {
        handleErrorUtil(filePath, 'updateUserGoogleTokens', err, 'Updating User Google Tokens');
    }
};

export const refreshGoogleAccessToken = async (email: string, refreshToken: string) => {
    try {
        const response = await axios.post("https://oauth2.googleapis.com/token", null, {
            params: {
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                refresh_token: refreshToken,
                grant_type: "refresh_token"
            }
        });

        const { access_token, id_token } = response.data;

        await updateUserGoogleTokens(email, { access_token, refresh_token: refreshToken, id_token });
    } catch (err) {
        handleErrorUtil(filePath, 'refreshGoogleAccessToken', err, 'Refreshing Google Tokens');
        console.error("Error refreshing Google access token", err);
    }
};

// GET api.plum.com/user/auth/callback
const googleCallback = async (req: Request, res: Response) => {
    const { code, state } = req.query;

    if (!code) {
        return res.redirect(`https://${frontendOrigin}/signin/?warning=google_auth_cancelled`);
    }

    try {
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.REDIRECT_URI,
            grant_type: 'authorization_code',
        });

        const { access_token, refresh_token, id_token, expires_in } = tokenResponse.data;
        const expiry_date = expires_in ? Date.now() + expires_in * 1000 : undefined;

        const userInfo = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });

        // Check if this OAuth flow was triggered to connect an additional mailbox
        let stateData: any = null;
        if (state) {
            try {
                const decoded = Buffer.from(String(state), 'base64').toString('utf-8');
                stateData = JSON.parse(decoded);
            } catch {
                try {
                    stateData = JSON.parse(String(state));
                } catch {}
            }
        }

        if ((stateData?.action === 'connect_mailbox' || stateData?.action === 'reauthorize_mailbox') && stateData?.userEmail) {
            // Link or reauthorize mailbox for the existing Plum user
            const ownerEmail = stateData.userEmail;
            const newMailboxEmail = userInfo.data.email;
            const fullName = [userInfo.data.given_name, userInfo.data.family_name].filter(Boolean).join(' ') || userInfo.data.name || newMailboxEmail;

            const updateFields: any = {
                userEmail: ownerEmail,
                email: newMailboxEmail,
                name: fullName,
                picture: userInfo.data.picture || '',
                'tokens.access_token': access_token,
                'tokens.id_token': id_token,
                status: 'connected',
                lastSyncAt: new Date(),
            };
            if (refresh_token) {
                updateFields['tokens.refresh_token'] = refresh_token;
            }
            if (expiry_date) {
                updateFields['tokens.expiry_date'] = expiry_date;
            }

            await Mailbox.findOneAndUpdate(
                { userEmail: ownerEmail, email: newMailboxEmail },
                { $set: updateFields },
                { upsert: true, new: true }
            );

            // Also synchronize across any other workspaces linking this Gmail account
            const syncFields: any = {
                'tokens.access_token': access_token,
                'tokens.id_token': id_token,
                status: 'connected',
                lastSyncAt: new Date(),
            };
            if (refresh_token) {
                syncFields['tokens.refresh_token'] = refresh_token;
            }
            if (expiry_date) {
                syncFields['tokens.expiry_date'] = expiry_date;
            }
            await Mailbox.updateMany({ email: newMailboxEmail }, { $set: syncFields });

            // Synchronize User table if user exists
            await User.updateOne(
                { email: newMailboxEmail },
                {
                    $set: {
                        'google.accessToken': access_token,
                        ...(refresh_token ? { 'google.refreshToken': refresh_token } : {}),
                        'google.IdToken': id_token,
                    }
                }
            );

            return res.redirect(`https://${frontendOrigin}/accounts?reauthorized=${encodeURIComponent(newMailboxEmail)}`);
        }

        // Standard user login / registration
        await createUser(res, userInfo.data, { access_token, refresh_token, id_token, expiry_date });

        // Update all Mailbox documents referencing this email with the fresh tokens
        const syncMailboxFields: any = {
            'tokens.access_token': access_token,
            'tokens.id_token': id_token,
            status: 'connected',
            lastSyncAt: new Date(),
        };
        if (refresh_token) {
            syncMailboxFields['tokens.refresh_token'] = refresh_token;
        }
        if (expiry_date) {
            syncMailboxFields['tokens.expiry_date'] = expiry_date;
        }
        await Mailbox.updateMany({ email: userInfo.data.email }, { $set: syncMailboxFields });

        await createAuthTokens(userInfo.data.email, res);

        res.cookie('picture', userInfo.data.picture, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            domain: '.plum.com',
            maxAge: Number(process.env.GMAIL_EXPIRY || 15) * 24 * 60 * 60 * 1000
        });

        res.redirect(`https://${frontendOrigin}/inbox`);
    } catch (err) {
        handleError('/src/controllers/user.controllers.ts', 'googleCallback', res, err, 'Google Callback');
    }
};

const userOps = {
    findUser,
    findUserUtil,
    getMe,
    logoutUser,
    createUser,
    loginUser,
    updateUserGoogleTokens,
    googleCallback,
    refreshGoogleAccessToken,
    getGoogleTokensUtil
};

export default userOps;