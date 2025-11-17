export interface Attachment {
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
}

export interface ParsedDate {
    weekday: string;
    day: string;
    month: string;
    year: string;
    time: string;
}

export interface InboundEmailType {
    email: string;
    id?: string;
    threadId?: string;
    to?: string;
    cc?: string;
    bcc?: string;
    senderEmail: string;
    senderName?: string;
    subject?: string;
    parsedDate?: ParsedDate;
    snippet?: string;
    bodyHtml?: string;
    bodyText?: string;
    attachments?: Attachment[];
    timestamp?: string;
    sizeEstimate?: number;
    categories?: string[];
    isViewed: boolean;

    createdAt: Date;
    updatedAt: Date;
};

export interface CategoryType {
    category: string,
    description: string,
    alert: boolean,
    email: string,
    color: string
};

export interface PopupFormArgs {
    formType: 'create-category' | 'edit-category'
    load: boolean,
    category: CategoryType | null,
};

export type IntentionType = {
    intent: 'fetch_db' | 'craft_mail' | 'general';
    confidence: number;
};

export type CraftedMailType = {
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    replyTo?: string;
    subject: string;
    body: string;
    category?: string[];
    status?: 'draft' | 'sent' | 'unsaved';
    createdAt?: Date;
    updatedAt?: Date;
};

export type FetchedMailsType = {
    mailIds: string[];
    createdAt?: Date;
    updatedAt?: Date;
};

export type QueryType = {
    query: string;
    isSuccess: boolean;
    result: [any];
    createdAt?: Date;
    updatedAt?: Date;
};

export type ResponseType = {
    response: string;
    thought?: string;
    craftedMail?: CraftedMailType;
    query?: QueryType;
    fetchedMails?: FetchedMailsType;
    chatCount: number;
    modelResponded?: string;
    createdAt?: Date;
    updatedAt?: Date;
};

export type UserPromptType = {
    prompt: string;
    intention?: IntentionType;
    chatCount: number;
    createdAt?: Date;
    updatedAt?: Date;
};

export type SystemPromptType = {
    prompt: string;
    chatCount: number;
    createdAt?: Date;
    updatedAt?: Date;
};

export type ChatType = {
    _id: string
    title?: string;
    email: string;
    userPrompts: UserPromptType[];
    systemPrompts: SystemPromptType[];
    responses: ResponseType[];
    archived: boolean;
    isViewed: boolean;
    lastMessageAt?: Date;
    messageCount: number;
    createdAt?: Date;
    updatedAt?: Date;
};

export type ChatMeta = {
    _id: string,
    email: string,
    title: string,
    archived: boolean,
    isViewed: boolean,
    createdAt: Date,
}