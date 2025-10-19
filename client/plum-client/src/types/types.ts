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