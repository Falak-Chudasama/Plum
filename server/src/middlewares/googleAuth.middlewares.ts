import { NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import { google } from "googleapis";
import userOps from "../controllers/user.controllers";
import globals from "../globals/globals";

import { AuthenticatedRequest, GoogleAuthenticatedRequest } from "../types/types";
import handleError from "../utils/errors.utils";

dotenv.config({ quiet: true })
const filePath = '/src/middlewares/googleAuth.middlewares.ts';

const clientID: string | undefined = process.env.GOOGLE_CLIENT_ID;
const clientSecret: string | undefined = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri: string | undefined = process.env.REDIRECT_URI;

if (!clientID || !clientSecret || !redirectUri) {
    throw Error('Google Client credentials not set in environement variables');
}

export const OAuthObjectCheck = async (email: string) => {
    if (email === globals.userGmail && globals.OAuthObject !== null) return;
    else {
        globals.userGmail = email;
        globals.OAuthObject = new google.auth.OAuth2(clientID, clientSecret, redirectUri);
    }

    const result = await userOps.getGoogleTokensUtil(globals.userGmail);
    if (!result.success) {
        throw Error('Failed to access credentials');
    }
    const { accessToken, refreshToken, IdToken } = result;
    globals.OAuthObject.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
        id_token: IdToken
    });
};

const authenticateUserGoogle = async (req: Request, res: Response, next: NextFunction) => {
    await OAuthObjectCheck((req as AuthenticatedRequest).user.email);
    try {
        (req as GoogleAuthenticatedRequest).auth = globals.OAuthObject!;
        next();
    } catch (err: any) {
        handleError(filePath, 'authenticateUserGoogle', res, err, 'Authenticating User with Google tokens');
    }
};

export default authenticateUserGoogle;