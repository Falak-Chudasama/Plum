import mongoose from 'mongoose';

const AttachmentSchema = new mongoose.Schema({
    filename: String,
    mimeType: String,
    size: Number,
    attachmentId: String,
});

export const outboundEmailSchema = new mongoose.Schema({
    from: { type: String, required: true },
    to: { type: [String], required: true },
    cc: { type: [String], default: [] },
    bcc: { type: [String], default: [] },
    replyTo: { type: String, default: '' },
    subject: { type: String, default: 'No Subject' },
    body: { type: String, default: '' },
    attachments: [AttachmentSchema],
    sentAt: { type: Date },
    category: { type: String, default: 'Other' },
    status: { type: String, enum: ['draft', 'sent'], default: 'draft' }
}, { timestamps: true });

const OutboundEmail = mongoose.model('OutboundEmail', outboundEmailSchema);

export default OutboundEmail;