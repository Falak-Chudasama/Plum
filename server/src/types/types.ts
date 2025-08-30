import { Request } from "express";
import { OAuth2Client } from 'google-auth-library';
import { InferSchemaType } from "mongoose";
import { userSchema } from "../models/user.models";
import { inboundEmailSchema } from "../models/inboundEmail.models";
import { outboundEmailSchema } from "../models/outboundEmail.models";
import { categorySchema } from "../models/category";
import { summarySchema } from "../models/summary";

export type UserType = InferSchemaType<typeof userSchema>; 
export type InboundEmailType = InferSchemaType<typeof inboundEmailSchema>;
export type OutboundEmailType = InferSchemaType<typeof outboundEmailSchema>;
export type CategoryType = InferSchemaType<typeof categorySchema>;
export type SummaryType = InferSchemaType<typeof summarySchema>;

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