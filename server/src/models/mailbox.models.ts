import mongoose, { Document, Schema } from 'mongoose';

export interface IMailboxTokens {
    access_token?: string;
    refresh_token?: string;
    id_token?: string;
    expiry_date?: number;
    scope?: string;
}

export interface IMailbox extends Document {
    userEmail: string;       // Owner Plum user account
    email: string;           // Connected Gmail address
    name?: string;           // Display name
    picture?: string;        // Avatar URL
    tokens: IMailboxTokens;
    status: 'connected' | 'expired' | 'revoked';
    lastSyncAt?: Date;
    isPrimary: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export const mailboxSchema = new Schema<IMailbox>({
    userEmail: {
        type: String,
        required: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        index: true,
    },
    name: {
        type: String,
        default: '',
    },
    picture: {
        type: String,
        default: '',
    },
    tokens: {
        access_token: { type: String },
        refresh_token: { type: String },
        id_token: { type: String },
        expiry_date: { type: Number },
        scope: { type: String },
    },
    status: {
        type: String,
        enum: ['connected', 'expired', 'revoked'],
        default: 'connected',
    },
    lastSyncAt: {
        type: Date,
    },
    isPrimary: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

// Prevent duplicate mailbox connections per user
mailboxSchema.index({ userEmail: 1, email: 1 }, { unique: true });

const Mailbox = mongoose.model<IMailbox>('Mailbox', mailboxSchema);

export default Mailbox;

