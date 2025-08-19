import { Request } from "express";
import { InferSchemaType } from "mongoose";
import { userSchema } from "../models/user.models";
import { OAuth2Client } from 'google-auth-library';

export type UserType = InferSchemaType<typeof userSchema>; 
export interface EmailType {
    from?: string,
    to: string | string[],
    cc?: string | string[],
    bcc?: string | string[],
    subject: string,
    contentType: 'text/plain' | 'text/html',
    body: string,
    files?: any,
};

export interface AuthenticatedRequest extends Request {
    user: { email: string }
};
export interface GoogleAuthenticatedRequest extends AuthenticatedRequest {
    auth: OAuth2Client
};

export interface HandleErrorOptionsType {
    res: Response;
    error: unknown;
    context?: string;
    statusCode?: number;
    logStack?: boolean;
};
