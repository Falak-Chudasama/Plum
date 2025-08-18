import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import dotenv from "dotenv";
import handleError, { handleErrorUtil } from '../utils/errors.utils';
import { AuthenticatedRequest } from '../types/types';

dotenv.config({ quiet: true });

const filePath = '/src/middlewares/auth.middlewares.ts';

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
if (!accessTokenSecret || !refreshTokenSecret) {
    throw new Error('Missing JWT secrets in environment variables');
}

const accessTokenExpiry = process.env.ACCESS_TOKEN_EXPIRY ?? '2' + 'd';
const refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY ?? '15' + 'd';

export const createAuthTokens = (
    email: string,
    res: Response
) => {
    try {
        const accessToken = jwt.sign(
            { email },
            accessTokenSecret,
            { expiresIn: accessTokenExpiry } as SignOptions
        );

        const refreshToken = jwt.sign(
            { email },
            refreshTokenSecret,
            { expiresIn: refreshTokenExpiry } as SignOptions
        );

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            domain: '.plum.com',
            maxAge: Number(process.env.ACCESS_TOKEN_EXPIRY) * 24 * 60 * 60 * 1000
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            domain: '.plum.com',
            maxAge: Number(process.env.REFRESH_TOKEN_EXPIRY) * 24 * 60 * 60 * 1000
        });
    } catch (err) {
        handleErrorUtil(filePath, 'createAuthTokens', err, 'Creating Authentication Tokens');
    }
};

export const refreshAccessToken = (req: AuthenticatedRequest, res: Response) => {
    try {
        const token = req.cookies?.refreshToken;
    
        if (!token) {
            return null;
        }
    
        const decodedEmail = jwt.verify(token, refreshTokenSecret) as { email: string };

        const accessToken = jwt.sign(
            { email: decodedEmail.email },
            accessTokenSecret,
            { expiresIn: accessTokenExpiry } as SignOptions
        );
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            domain: '.plum.com',
            maxAge: 2 * 24 * 60 * 60 * 1000
        });

        return decodedEmail.email;
    } catch (err: any) {
        if (err.name === 'TokenExpiredError') {
            handleErrorUtil(filePath, 'refreshAccessToken', err, 'Refreshing User Token', 401);
        } else if (err.name === 'JsonWebTokenError') {
            handleErrorUtil(filePath, 'refreshAccessToken', err, 'Refreshing User Token', 401);
        } else {
            handleErrorUtil(filePath, 'refreshAccessToken', err, 'Refreshing User Token');
        }
        return null;
    }
};

const authenticateUser = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const token = req.cookies?.accessToken || req.headers['authorization']?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Access token missing' });
        }

        const decodedEmail = jwt.verify(token, accessTokenSecret) as { email: string };

        (req as AuthenticatedRequest).user = { email: decodedEmail.email };

        next();
    } catch (err: any) {
        if (err.name === 'TokenExpiredError') {
            const refreshedEmail = refreshAccessToken(req as AuthenticatedRequest, res);

            if (!refreshedEmail) {
                return res.status(401).json({ error: 'Session expired. Please login again.' });
            }

            (req as AuthenticatedRequest).user = { email: refreshedEmail };
            return next();
        } else if (err.name === 'JsonWebTokenError') {
            handleError(filePath, 'authenticateUser', res, err, 'Authenticating User', 401);
        } else {
            handleError(filePath, 'authenticateUser', res, err, 'Authenticating User');
        }
    }
};

export default authenticateUser;