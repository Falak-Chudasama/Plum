import mongoose, { Document, Schema } from 'mongoose';

export interface IContextNote extends Document {
    userEmail: string;
    title: string;
    content: string;
    tags: string[];
    embedding: number[];
    createdAt: Date;
    updatedAt: Date;
}

export const contextNoteSchema = new Schema<IContextNote>(
    {
        userEmail: {
            type: String,
            required: true,
            index: true,
        },
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
        embedding: {
            type: [Number],
            default: [],
        },
    },
    { timestamps: true }
);

contextNoteSchema.index({ userEmail: 1, createdAt: -1 });

const ContextNote = mongoose.model<IContextNote>('ContextNote', contextNoteSchema);

export default ContextNote;

