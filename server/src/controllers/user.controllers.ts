import { Request, Response } from "express";
import axios from "axios";
import handleError, { handleErrorUtil } from "../utils/errors.utils";
import User from "../models/user.models";
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

// GET api.plum.com/user/
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

/*
 * Google Auth Ops
*/

const createUser = async (res: Response, data: any, tokens: { access_token: string, refresh_token: string, id_token: string }) => {
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
        settingsOps.add('email', data.email);
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

        createAuthTokens(email, res);
        settingsOps.add('email', email);
        OAuthObjectCheck(email);
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
    const { code } = req.query;

    if (!code) {
        return res.redirect(`http://${frontendOrigin}/signup/?warning=google_auth_cancelled`);
    }

    try {
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.REDIRECT_URI,
            grant_type: 'authorization_code',
        });

        const { access_token, refresh_token, id_token } = tokenResponse.data;

        const userInfo = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });

        await createUser(res, userInfo.data, { access_token, refresh_token, id_token });

        createAuthTokens(userInfo.data.email, res);

        res.redirect(`http://${frontendOrigin}`);
    } catch (err) {
        handleError('/src/controllers/user.controllers.ts', 'googleCallback', res, err, 'Google Callback');
    }
};

const userOps = {
    findUser,
    findUserUtil,
    createUser,
    loginUser,
    updateUserGoogleTokens,
    googleCallback,
    refreshGoogleAccessToken,
    getGoogleTokensUtil
};

export default userOps;