import mongoose, { Schema, Document } from 'mongoose';
import { formatDateTime } from '../utils/utils';

export interface IChatToolEvent {
    tool: string;
    label: string;
    summary?: string;
    success: boolean;
}

export interface IChatRagNote {
    id: string;
    title: string;
    content?: string;
    denseScore?: number;
    bm25Score?: number;
}

export interface IChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    craftedMail?: Record<string, any>;
    toolEvents?: IChatToolEvent[];
    ragNotes?: IChatRagNote[];
    thought?: string;
    created_at?: string;
}

export interface IChat extends Document {
    session_id: string;
    title: string;
    application: string;
    messages: IChatMessage[];
    userPrompts?: any[];
    responses?: any[];
    messageCount?: number;
    lastMessageAt?: Date;
    created_at: string;
    updated_at: string;
    email?: string;
    mailboxEmail?: string;
}

export const ChatMessageSchema = new Schema<IChatMessage>(
    {
        role: {
            type: String,
            enum: ['user', 'assistant', 'system'],
            required: true,
            default: 'user',
        },
        content: {
            type: String,
            default: '',
        },
        craftedMail: {
            type: Schema.Types.Mixed,
            default: undefined,
        },
        toolEvents: {
            type: [Schema.Types.Mixed],
            default: undefined,
        },
        ragNotes: {
            type: [Schema.Types.Mixed],
            default: undefined,
        },
        thought: {
            type: String,
            default: undefined,
        },
        created_at: {
            type: String,
            default: () => formatDateTime(),
        },
    },
    { _id: false }
);

export const ChatSchema = new Schema<IChat>(
    {
        session_id: {
            type: String,
            required: true,
            default: () => new mongoose.Types.ObjectId().toString(),
            index: true,
        },
        title: {
            type: String,
            default: 'New Chat',
            trim: true,
        },
        application: {
            type: String,
            default: 'plum',
            required: true,
            index: true,
        },
        messages: {
            type: [ChatMessageSchema],
            default: [],
        },
        userPrompts: {
            type: [Schema.Types.Mixed],
            default: undefined,
        },
        responses: {
            type: [Schema.Types.Mixed],
            default: undefined,
        },
        messageCount: {
            type: Number,
            default: 0,
        },
        lastMessageAt: {
            type: Date,
            default: undefined,
        },
        created_at: {
            type: String,
            default: () => formatDateTime(),
        },
        updated_at: {
            type: String,
            default: () => formatDateTime(),
        },
        email: {
            type: String,
            sparse: true,
            index: true,
        },
        mailboxEmail: {
            type: String,
            sparse: true,
            index: true,
        },
    },
    {
        collection: 'chats',
        timestamps: false,
    }
);

ChatSchema.index({ application: 1, updated_at: -1 });
ChatSchema.index({ application: 1, email: 1, updated_at: -1 });

const Chats = mongoose.models.Chat || mongoose.model<IChat>('Chat', ChatSchema, 'chats');

export default Chats;
