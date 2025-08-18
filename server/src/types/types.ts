import { Request } from "express";

export interface AuthenticatedRequest extends Request {
    user: { email: string }
};

export interface HandleErrorOptionsType {
    res: Response;
    error: unknown;
    context?: string; // e.g., "LoginController" or "OAuth Callback"
    statusCode?: number;
    logStack?: boolean;
};

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