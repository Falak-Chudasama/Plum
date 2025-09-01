import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import handleError, { handleErrorUtil } from '../utils/errors.utils';
import { AuthenticatedRequest } from '../types/types';

const filePath = '/src/middlewares/auth.middlewares.ts';

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
if (!accessTokenSecret || !refreshTokenSecret) {
    throw new Error('Missing JWT secrets in environment variables');
}

const accessTokenDays = Number(process.env.ACCESS_TOKEN_EXPIRY) || 2;
const refreshTokenDays = Number(process.env.REFRESH_TOKEN_EXPIRY) || 15;
const accessTokenExpiry = accessTokenDays + 'd';
const refreshTokenExpiry = refreshTokenDays + 'd';

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

        const accessTokenDays = parseExpiryToDays(accessTokenExpiry);
        const refreshTokenDays = parseExpiryToDays(refreshTokenExpiry);

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            domain: '.plum.com',
            maxAge: accessTokenDays * 24 * 60 * 60 * 1000
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            domain: '.plum.com',
            maxAge: refreshTokenDays * 24 * 60 * 60 * 1000
        });

        res.cookie('gmail', email, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            domain: '.plum.com',
            maxAge: Number(process.env.GMAIL_EXPIRY)! * 24 * 60 * 60 * 1000
        });

    } catch (err) {
        handleErrorUtil(filePath, 'createAuthTokens', err, 'Creating Authentication Tokens');
    }
};

export const refreshAccessToken = (req: Request, res: Response) => {
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

        const accessTokenDays = parseExpiryToDays(accessTokenExpiry);

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            domain: '.plum.com',
            maxAge: accessTokenDays * 24 * 60 * 60 * 1000
        });

        return decodedEmail.email;

    } catch (err: any) {
        if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
            handleErrorUtil(filePath, 'refreshAccessToken', err, 'Refreshing User Token', 401);
        } else {
            handleErrorUtil(filePath, 'refreshAccessToken', err, 'Refreshing User Token');
        }
        return null;
    }
};

const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.accessToken || req.headers['authorization']?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Access token missing' });
        }

        const verifiedPayload = jwt.verify(token, accessTokenSecret) as { email: string };

        if (!verifiedPayload.email) {
            return res.status(401).json({ error: 'Invalid token: missing email' });
        }

        (req as AuthenticatedRequest).user = { email: verifiedPayload.email };
        next();
    } catch (err: any) {
        if (err.name === 'TokenExpiredError') {
            const refreshedEmail = refreshAccessToken(req, res);

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

function parseExpiryToDays(expiry: string): number {
    const match = expiry.match(/^(\d+)([dhms])$/);
    if (!match) return 1;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 'd': return value;
        case 'h': return value / 24;
        case 'm': return value / (24 * 60);
        case 's': return value / (24 * 60 * 60);
        default: return 1;
    }
}

export default authenticateUser;