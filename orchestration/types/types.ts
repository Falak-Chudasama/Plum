export interface Intent {
    intent: ('fetch_db' | 'craft_mail' | 'general' | 'titling')
};

export interface UserObjType {
    email: string,
    firstName: string,
    lastName: string
}

export interface GenerateArgs {
    socket?: WebSocket,
    model?: string;
    prompt?: string;
    system?: string;
    intent?: string;
    temperature?: number,
    stream?: boolean;
};

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
    color: string,
};