import mongoose, { Schema, Document } from 'mongoose';
import { formatDateTime } from '../utils/utils';

export interface IChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at?: string;
}

export interface IChat extends Document {
    session_id: string;
    title: string;
    application: string;
    messages: IChatMessage[];
    created_at: string;
    updated_at: string;
    email?: string;
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
            required: true,
            default: '',
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
            index: true,
        },
        title: {
            type: String,
            default: 'New Conversation',
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
    },
    {
        collection: 'chats',
        timestamps: false,
    }
);

ChatSchema.index({ application: 1, updated_at: -1 });

const Chats = mongoose.models.Chat || mongoose.model<IChat>('Chat', ChatSchema, 'chats');

export default Chats;
