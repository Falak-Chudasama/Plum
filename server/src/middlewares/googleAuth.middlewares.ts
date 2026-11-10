import { NextFunction, Request, Response } from "express";
import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import userOps from "../controllers/user.controllers";
import Mailbox from "../models/mailbox.models";
import User from "../models/user.models";
import { AuthenticatedRequest, GoogleAuthenticatedRequest } from "../types/types";
import handleError, { handleErrorUtil } from "../utils/errors.utils";

const filePath = "/src/middlewares/googleAuth.middlewares.ts";

const clientID: string | undefined = process.env.GOOGLE_CLIENT_ID;
const clientSecret: string | undefined = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri: string | undefined = process.env.REDIRECT_URI;

if (!clientID || !clientSecret || !redirectUri) {
    throw new Error("Google Client credentials not set in environment variables");
}

/**
 * Creates an isolated, per-request Google OAuth2Client for a specific user and mailbox account.
 * Enforces account isolation and per-mailbox token management.
 */
export const createOAuthClientForMailbox = async (
    userEmail: string,
    mailboxEmail?: string
): Promise<{ client: OAuth2Client; mailboxEmail: string }> => {
    const oauth2Client = new google.auth.OAuth2(clientID, clientSecret, redirectUri);

    let mailbox = null;

    if (mailboxEmail) {
        // Enforce that target mailbox belongs to this user
        mailbox = await Mailbox.findOne({ userEmail, email: mailboxEmail });
        if (!mailbox) {
            // Also check if mailbox is registered under user's own email directly
            mailbox = await Mailbox.findOne({ email: mailboxEmail, userEmail });
        }
    }

    if (!mailbox) {
        // Fallback: pick primary mailbox, or the first connected mailbox for this user
        mailbox = await Mailbox.findOne({ userEmail, isPrimary: true });
        if (!mailbox) {
            mailbox = await Mailbox.findOne({ userEmail });
        }
    }

    if (mailbox && mailbox.tokens) {
        oauth2Client.setCredentials({
            access_token: mailbox.tokens.access_token,
            refresh_token: mailbox.tokens.refresh_token,
            id_token: mailbox.tokens.id_token,
            expiry_date: mailbox.tokens.expiry_date,
        });

        // Set up token refresh listener to persist new tokens
        oauth2Client.on("tokens", async (newTokens) => {
            try {
                const updateFields: any = {};
                if (newTokens.access_token) updateFields["tokens.access_token"] = newTokens.access_token;
                if (newTokens.refresh_token) updateFields["tokens.refresh_token"] = newTokens.refresh_token;
                if (newTokens.id_token) updateFields["tokens.id_token"] = newTokens.id_token;
                if (newTokens.expiry_date) updateFields["tokens.expiry_date"] = newTokens.expiry_date;
                updateFields["status"] = "connected";

                await Mailbox.updateOne({ _id: mailbox._id }, { $set: updateFields });
            } catch (err) {
                console.error("Failed to update refreshed tokens in Mailbox:", err);
            }
        });

        return { client: oauth2Client, mailboxEmail: mailbox.email };
    }

    // Fallback to legacy User record if no Mailbox document exists yet
    const targetEmail = mailboxEmail || userEmail;
    const result = await userOps.getGoogleTokensUtil(targetEmail);
    if (!result.success || !result.accessToken) {
        throw new Error(`No Google credentials found for account: ${targetEmail}`);
    }

    oauth2Client.setCredentials({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        id_token: result.IdToken,
    });

    return { client: oauth2Client, mailboxEmail: targetEmail };
};

/**
 * Backward compatibility: creates an OAuth client for a specific user email
 */
export const createOAuthClientForUser = async (email: string): Promise<OAuth2Client> => {
    const { client } = await createOAuthClientForMailbox(email, email);
    return client;
};

// Backward compatibility export
export const OAuthObjectCheck = async (email: string) => {
    return createOAuthClientForUser(email);
};

/**
 * Express middleware that authenticates the user's active Google mailbox
 * and sets req.auth and req.mailbox.
 */
const authenticateUserGoogle = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userEmail = (req as AuthenticatedRequest).user?.email;
        if (!userEmail) {
            return res.status(401).json({ error: "Unauthorized: User not authenticated", success: false });
        }

        // Determine target mailbox from headers, query, or body
        const requestedMailbox =
            (req.headers["x-mailbox-email"] as string) ||
            (req.query.mailboxEmail as string) ||
            req.body?.mailboxEmail ||
            req.body?.email?.from ||
            req.body?.email ||
            req.body?.from;

        const { client, mailboxEmail } = await createOAuthClientForMailbox(userEmail, requestedMailbox);

        (req as GoogleAuthenticatedRequest).auth = client;
        (req as GoogleAuthenticatedRequest).mailbox = {
            email: mailboxEmail,
            userEmail,
        };

        next();
    } catch (err: any) {
        handleError(filePath, "authenticateUserGoogle", res, err, "Authenticating user with Google tokens", 401);
    }
};

export default authenticateUserGoogle;
