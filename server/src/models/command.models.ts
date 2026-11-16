import mongoose, { Document, Schema } from 'mongoose';
import { formatDateTime } from '../utils/utils';

export interface ICommand extends Document {
    command: string;
    is_active: boolean;
    application: string;
    created_at: string;
    updated_at: string;
}

export const CommandSchema = new Schema<ICommand>(
    {
        command: {
            type: String,
            required: true,
            trim: true,
        },
        is_active: {
            type: Boolean,
            default: true,
            index: true,
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
    },
    {
        collection: 'commands',
        timestamps: false,
    }
);

CommandSchema.index({ application: 1, is_active: 1 });

const Command = mongoose.models.Command || mongoose.model<ICommand>('Command', CommandSchema, 'commands');

export default Command;
