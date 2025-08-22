import mongoose from 'mongoose';

const AttachmentSchema = new mongoose.Schema({
    filename: String,
    mimeType: String,
    size: Number,
    attachmentId: String,
});

const ParsedDateSchema = new mongoose.Schema({
    weekday: String,
    day: String,
    month: String,
    year: String,
    time: String,
});

const inboundEmailSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    id: { type: String, required: true, unique: true },
    threadId: { type: String, required: true },
    to: { type: String },
    cc: { type: String },
    bcc: { type: String },
    senderEmail: { type: String, required: true },
    senderName: { type: String },
    subject: { type: String },
    parsedDate: ParsedDateSchema,
    snippet: { type: String },
    bodyHtml: { type: String },
    bodyText: { type: String },
    attachments: [AttachmentSchema],
    timestamp: { type: String },
    sizeEstimate: { type: Number },
    category: { type: String }
}, { timestamps: true });

const InboundEmail = mongoose.model('InboundEmail', inboundEmailSchema);
export { inboundEmailSchema };
export default InboundEmail;