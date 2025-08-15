import { Request, Response } from "express";
import axios from "axios";
import handleError, { handleErrorUtil } from "../utils/errors.utils";
import User from "../models/user.models";
import logger from "../utils/logger.utils";

const filePath = '/src/controllers/user.controllers';

// TODO: add user operations, creation and auth

const createUser = async (res: Response, data: any, tokens: { access_token: string, refresh_token: string, id_token: string }) => {
    try {
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
    } catch (err) {
        handleError(filePath, 'createUserUtil', res, err, 'Creating a User');
    }
    
};

// GET /api.plum.com/user/auth/callback
const googleCallback = async (req: Request, res: Response) => {
    const { code } = req.query;
    try {
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: 'http://api.plum.com/user/auth/callback',
            grant_type: 'authorization_code',
        });
    
        const { access_token, refresh_token, id_token } = tokenResponse.data;
    
        const userInfo = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        await createUser(res, userInfo.data, { access_token, refresh_token, id_token });
        res.redirect('http://plum.com');
    } catch (err) {
        handleError('/src/controllers/user.controllers.ts', 'googleCallback', res, err, 'Google Callback');
    }
}

const userOps = {
    createUser,
    googleCallback
};

export default userOps;
