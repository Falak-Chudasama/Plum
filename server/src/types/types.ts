import { Request } from "express";
import { OAuth2Client } from 'google-auth-library';
import { InferSchemaType } from "mongoose";
import { userSchema } from "../models/user.models";
import { inboundEmailSchema } from "../models/inboundEmail.models";
import { outboundEmailSchema } from "../models/outboundEmail.models";
import { categorySchema } from "../models/category";
import { summarySchema } from "../models/summary";
import { ChatSchema } from "../models/chat";

export type UserType = InferSchemaType<typeof userSchema> & { _id?: any }; 
export type InboundEmailType = InferSchemaType<typeof inboundEmailSchema> & { _id?: any };
export type OutboundEmailType = InferSchemaType<typeof outboundEmailSchema> & { _id?: any; category?: string };
export type CategoryType = InferSchemaType<typeof categorySchema> & { _id?: any };
export type SummaryType = InferSchemaType<typeof summarySchema> & { _id?: any };
export type ChatType = InferSchemaType<typeof ChatSchema> & { _id?: any };

export interface AuthenticatedRequest extends Request {
    user: { email: string };
}

export interface GoogleAuthenticatedRequest extends AuthenticatedRequest {
    auth: OAuth2Client;
    mailbox?: {
        email: string;
        userEmail: string;
        name?: string;
    };
}

export interface HandleErrorOptionsType {
    res: Response;
    error: unknown;
    context?: string;
    statusCode?: number;
    logStack?: boolean;
}
