import mongoose, { Document, Schema } from 'mongoose';
import { formatDateTime } from '../utils/utils';

export interface INote extends Document {
    title: string;
    content: string;
    tags: string[];
    metadata: Record<string, any>;
    application: string;
    created_at: string;
    updated_at: string;
    userEmail?: string;
    embedding?: number[];
}

export const NoteSchema = new Schema<INote>(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
        },
        tags: {
            type: [String],
            default: [],
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
        application: {
            type: String,
            default: 'plum',
            required: true,
            index: true,
        },
        created_at: {
            type: String,
            default: () => formatDateTime(),
        },
        updated_at: {
            type: String,
            default: () => formatDateTime(),
        },
        userEmail: {
            type: String,
            sparse: true,
            index: true,
        },
        embedding: {
            type: [Number],
            default: [],
        },
    },
    {
        collection: 'notes',
        timestamps: false,
    }
);

NoteSchema.index({ application: 1, updated_at: -1 });

const Note = mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema, 'notes');

export default Note;
