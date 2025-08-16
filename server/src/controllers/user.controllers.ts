import { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import handleError, { handleErrorUtil } from "../utils/errors.utils";
import User from "../models/user.models";
import logger from "../utils/logger.utils";

dotenv.config({ quiet: true });

const frontendOrigin = process.env.FRONTEND_ORIGIN!;
const filePath = '/src/controllers/user.controllers';

// TODO: add user operations, auth

const findUserUtil = async (email: string): Promise<boolean> => {
    try {
        const user = await User.findOne({ email });
        return !!user;
    } catch (err) {
        handleErrorUtil(filePath, 'findUserUtil', err, 'Finding User by Email in DB');
    }
    return false;
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
    } catch (err) {
        handleError(filePath, 'createUserUtil', res, err, 'Creating a User');
    }
};

const updateUserGoogleTokens = async (email: string, tokens: { access_token: string, refresh_token: string, id_token: string }) => {
    try {
        const updatedUser = await User.updateOne(
            { email: email },
            {
                $set: {
                    'google.accessToken': tokens.access_token,
                    'google.refreshToken': tokens.refresh_token,
                    'google.idToken': tokens.id_token,
                }
            }
        );

        if (updatedUser.modifiedCount === 0) {
            throw Error('User was not updated');
        }
    } catch (err) {
        handleErrorUtil(filePath, 'updateUserGoogleTokens', err, 'Updating User Google Tokens');
    }
};

const googleCallback = async (req: Request, res: Response) => {
    // GET /api.plum.com/user/auth/callback
    const { code } = req.query;
    if (!code) {
        return res.redirect('http://' + frontendOrigin + '/signup/?warning=google_auth_cancelled');
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
            headers: { Authorization: `Bearer ${access_token}` },
        });

        await createUser(res, userInfo.data, { access_token, refresh_token, id_token });
        // return access and refresh tokens of plum along with a success:true message
        res.redirect('http://' + frontendOrigin)
    } catch (err) {
        handleError('/src/controllers/user.controllers.ts', 'googleCallback', res, err, 'Google Callback');
    }
}

const userOps = {
    createUser,
    googleCallback
};

export default userOps;
