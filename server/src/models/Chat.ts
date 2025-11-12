import mongoose from 'mongoose';

export const Intention = new mongoose.Schema({
    intent: { type: String, enum: ['fetch_db', 'craft_email', 'general'], default: 'general' },
    confidence: { type: Number, default: 0 }
});

export const CraftedMail = new mongoose.Schema({
    from: { type: String, required: true },
    to: { type: [String], required: true },
    cc: { type: [String], default: [] },
    bcc: { type: [String], default: [] },
    replyTo: { type: String, default: '' },
    subject: { type: String, default: 'No Subject' },
    body: { type: String, default: '' },
    category: { type: [String], default: ['Other'] },
    status: { type: String, enum: ['draft', 'sent', 'unsaved'], default: 'unsaved' }
}, { timestamps: true });

export const FetchedMails = new mongoose.Schema({
    mailIds: { type: [String], default: [] }
}, { timestamps: true });

export const Query = new mongoose.Schema({
    query: { type: String, required: true },
    isSuccess: { type: Boolean, default: false },
    resultCount: { type: Number, default: 0 }
}, { timestamps: true });

export const ResponseSchema = new mongoose.Schema({
    response: { type: String, required: true },
    thought: { type: String, default: '<no_thoughts>' },
    craftedMail: { type: CraftedMail },
    query: { type: Query },
    fetchedMails: { type: FetchedMails },
    chatCount: { type: Number, required: true },
    modelResponded: { type: String, default: 'unknown' }
}, { timestamps: true });

export const UserPromptSchema = new mongoose.Schema({
    prompt: { type: String, required: true },
    intention: { type: Intention },
    chatCount: { type: Number, required: true }
}, { timestamps: true });

export const SystemPromptSchema = new mongoose.Schema({
    prompt: { type: String, required: true },
    chatCount: { type: Number, required: true }
}, { timestamps: true });

export const ChatSchema = new mongoose.Schema({
    title: { type: String, default: 'New Conversation' },
    email: { type: String, required: true },
    userPrompts: { type: [UserPromptSchema], default: [] },
    systemPrompts: { type: [SystemPromptSchema], default: [] },
    responses: { type: [ResponseSchema], default: [] },
    archived: { type: Boolean, default: false },
    isViewed: { type: Boolean, default: false },
    lastMessageAt: { type: Date },
    messageCount: { type: Number, default: 0 }
}, { timestamps: true });

const Chats = mongoose.model('Chat', ChatSchema);

export default Chats;