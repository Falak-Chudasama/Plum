import { Request, Response } from "express";
import MailComposer from "nodemailer/lib/mail-composer";
import { google } from "googleapis";

import handleError, { handleErrorUtil } from "../utils/errors.utils";
import { InboundEmailType, OutboundEmailType, GoogleAuthenticatedRequest } from "../types/types";
import models from "../models/models";
import emailCleanser from "../utils/emailCleanser.utils";

const filePath: string = '/src/controllers/email.controllers.ts'

// TODO: Use dynamic fields from `email` if needed

const saveOutboundEmail = async (payload: OutboundEmailType) => {
    try {
        const record = new models.OutboundEmail({
            from: payload.from,
            to: payload.to,
            cc: payload.cc || [],
            bcc: payload.bcc || [],
            replyTo: payload.replyTo || "",
            subject: payload.subject || "No Subject",
            body: payload.body || "",
            attachments: payload.attachments?.map((file) => ({
                filename: file.filename,
                mimeType: file.mimeType,
                size: file.size,
                attachmentId: file.attachmentId,
            })) || [],
            sentAt: new Date(),
            category: payload.category,
            status: "sent",
        });

        const savedContent = await record.save();
        return savedContent;
    } catch (err) {
        handleErrorUtil(filePath, 'saveOutboundMail', err, `Saving outbound mail 'from': ${payload.from} 'to': ${payload.to}`);
        throw err;
    }
};

const saveDraftMail = async (payload: OutboundEmailType) => {
    try {
        const record = new models.OutboundEmail({
            from: payload.from,
            to: payload.to || [],
            cc: payload.cc || [],
            bcc: payload.bcc || [],
            replyTo: payload.replyTo || "",
            subject: payload.subject || "No Subject",
            body: payload.body || "",
            attachments: payload.attachments?.map((file) => ({
                filename: file.filename,
                mimeType: file.mimeType,
                size: file.size,
                attachmentId: file.attachmentId,
            })) || [],
            category: payload.category,
            status: "draft",
        });

        const savedContent = await record.save();
        return savedContent;
    } catch (err) {
        handleErrorUtil(
            filePath,
            "saveDraftMail",
            err,
            `Saving draft mail 'from': ${payload.from} 'to': ${payload.to}`
        );
        throw err;
    }
};

const saveInboundEmails = async (emails: InboundEmailType[]): Promise<{ inserted: number; skipped: number }> => {
    try {
        if (emails.length === 0) return { inserted: 0, skipped: 0 };
        const modifiedEmails = emails.map((email) => {
            if (!email.subject) {
                email.subject = 'No Subject';
            }
            return email;
        })
        await models.InboundEmail.insertMany(modifiedEmails);
        return { inserted: emails.length, skipped: 0 };
    } catch (err) {
        handleErrorUtil(filePath, "saveInboundEmails", err, "Saving inbound emails to DB");
        return { inserted: 0, skipped: emails.length };
    }
};

const fetchEmailsUtil = async (OAuth: object, numberOfEmails: number = 10) => {
    // @ts-ignore
    const gmail = google.gmail({ version: 'v1', auth: OAuth });
    try {
        const messageListResponse = await gmail.users.messages.list({
            userId: 'me',
            labelIds: ['INBOX'],
            maxResults: numberOfEmails,
        });

        const messages = messageListResponse.data.messages;
        if (!messages || messages.length === 0) {
            return [];
        }

        const extractBody = (payload: any): { html?: string; text?: string } => {
            let html = '';
            let text = '';

            const walk = (parts: any[]) => {
                for (const part of parts) {
                    if (part.mimeType === 'text/html' && part.body?.data) {
                        html = Buffer.from(part.body.data, 'base64').toString('utf-8');
                    } else if (part.mimeType === 'text/plain' && part.body?.data) {
                        text = Buffer.from(part.body.data, 'base64').toString('utf-8');
                    }

                    if (part.parts) walk(part.parts);
                }
            };

            if (payload?.parts) walk(payload.parts);
            else if (payload?.body?.data) {
                text = Buffer.from(payload.body.data, 'base64').toString('utf-8');
            }

            return { html, text };
        };

        const emailPromises = messages.map(async (email) => {
            const msgData = await gmail.users.messages.get({
                userId: 'me',
                id: email.id!,
                format: 'full',
            });

            const payload = msgData.data.payload;
            const headers = payload?.headers || [];

            const getHeader = (name: string) =>
                headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

            const from = getHeader('From').replace(/["\\]/g, '').trim();
            const to = getHeader('To').trim();
            const cc = getHeader('Cc').trim();
            const bcc = getHeader('Bcc').trim();
            const subject = getHeader('Subject').replace(/["\\]/g, '').trim();
            const date = getHeader('Date');
            const snippet = msgData.data.snippet || '';
            const sizeEstimate = msgData.data.sizeEstimate || 0;

            const senderEmail = from?.match(/<(.+)>/)?.[1] || from;
            const senderName = from?.match(/(.*)<.*>/)?.[1]?.trim().replace(/["\\]/g, '') || from;

            const timestamp = new Date(date).toISOString();

            const jsDate = new Date(date);
            const parsedDate = {
                weekday: jsDate.toLocaleString('en-US', { weekday: 'long' }),
                day: jsDate.getDate().toString().padStart(2, '0'),
                month: jsDate.toLocaleString('en-US', { month: 'long' }),
                year: jsDate.getFullYear().toString(),
                time: jsDate.toTimeString().split(' ')[0],
            };

            const { html: bodyHtml, text } = extractBody(payload);

            const bodyText = emailCleanser(text);

            const attachments: {
                filename: string;
                mimeType: string;
                size: number;
                attachmentId: string;
            }[] = [];

            const extractAttachments = (parts: any[]) => {
                for (const part of parts) {
                    if (part.filename && part.body?.attachmentId) {
                        attachments.push({
                            filename: part.filename,
                            mimeType: part.mimeType,
                            size: part.body.size,
                            attachmentId: part.body.attachmentId,
                        });
                    }

                    if (part.parts) extractAttachments(part.parts);
                }
            };

            if (payload?.parts) extractAttachments(payload.parts);

            return {
                id: email.id,
                threadId: email.threadId,
                to,
                cc,
                bcc,
                senderEmail,
                senderName,
                subject,
                parsedDate,
                snippet,
                bodyHtml,
                bodyText,
                attachments,
                timestamp,
                sizeEstimate,
                isViewed: false
            };
        });

        const emails = await Promise.all(emailPromises);
        return emails;
    } catch (err) {
        handleErrorUtil(filePath, 'fetchEmailsUtil', err, 'Fetching Emails (Utility)')
    }
};

const fetchUniqueEmails = async (emails: InboundEmailType[]): Promise<InboundEmailType[]> => {
    try {
        const ids = emails.map((email) => email.id);
        const existing = await models.InboundEmail.find(
            {
                id: { $in: ids }
            },
            { id: 1 }
        );

        const existingIds = new Set(existing.map(e => e.id));
        return emails.filter((email) => !existingIds.has(email.id));
    } catch (err) {
        handleErrorUtil(filePath, 'fetchUniqueEmails', err, 'Fetching Unique Emails');
    }
    return [];
};

const fetchEmailsDateUtil = async (email: string, day: string, month: string, year: string): Promise<InboundEmailType[]> => {
    try {
        const emails = await models.InboundEmail.find({ email, "parsedDate.day": day, "parsedDate.month": month, "parsedDate.year": year });
        return emails ?? [];
    } catch (err) {
        handleErrorUtil(filePath, 'fetchEmailsDateUtil', err, 'Fetching Emails by Date');
    }
    return [];
};

// GET api.plum.com/email/fetch
const fetchEmails = async (req: Request, res: Response) => {
    const googleReq = req as GoogleAuthenticatedRequest;
    const OAuth = googleReq.auth!;

    const numberOfEmails = Number(req.query.numberOfEmails || 10);

    try {
        const emails = await fetchEmailsUtil(OAuth, numberOfEmails);

        if (!emails) {
            throw Error('Could not fetch emails');
        }

        return res.status(200).json({
            emails,
            emailsCount: emails.length,
            success: true,
        });
    } catch (err) {
        handleError(filePath, 'fetchEmails', res, err, 'Fetching Emails via Gmail');
    }
};

// GET api.plum.com/email/fetch-by-date
const fetchEmailsDate = async (req: Request, res: Response) => {
    const { email, date, month, year } = req.body;

    try {
        const emails = await fetchEmailsDateUtil(email, date, month, year);

        if (!emails) {
            throw Error('Could not fetch emails');
        }

        return res.status(200).json({
            emails,
            emailsCount: emails.length,
            success: true,
        });
    } catch (err) {
        handleError(filePath, 'fetchEmailsDate', res, err, 'Fetching Emails by Date via Gmail');
    }
};

// PUT api.plum.com/email/set-is-viewed
const updateIsViewed = async (req: Request, res: Response) => {
    try {
        const { id, email } = req.body;
        if (!id) {
            throw Error("Email's ID was not given");
        }
        if (!email) {
            throw Error('Gmail ID was not given');
        }

        const response = await models.InboundEmail.updateOne(
            { id },
            {
                $set: {
                    isViewed: true
                }
            }
        );

        if (response.matchedCount === 0) {
            throw Error('Email was not found');
        }

        return res.status(200).json({ result: response, success: true });
    } catch (err) {
        if (err.message.endsWith('not found')){
            handleError(filePath, 'setIsViewed', res, err, 'Setting the email as viewed (User gmail was not found)', 404);
        } else {
            handleError(filePath, 'setIsViewed', res, err, 'Setting the email as viewed');
        }
    }
};

// POST api.plum.com/email/draft
const draftEmail = async (req: Request, res: Response) => {
    try {
        const payload = req.body.email as OutboundEmailType;

        if (!payload.from) {
            return handleError(
                filePath,
                "draftEmail",
                res,
                "Missing required field: `from`",
                "InvalidRequest",
                400
            );
        }

        const record = await saveDraftMail(payload);

        return res.status(200).json({
            success: true,
            message: "Draft saved successfully",
            draftRecord: record,
        });

    } catch (err) {
        return handleError(filePath, "draftEmail", res, err, "Saving Draft Email");
    }
};

// POST api.plum.com/email/send
const sendEmail = async (req: Request, res: Response) => {
    const googleReq = req as GoogleAuthenticatedRequest;
    const OAuth = googleReq.auth;

    const payload = req.body.email as OutboundEmailType

    if (!payload.from || !payload.to?.length) {
        return handleError(
            filePath,
            "sendEmail",
            res,
            "Missing required fields: `from` and at least one `to`",
            "InvalidRequest",
            400
        );
    }

    const gmail = google.gmail({ version: "v1", auth: OAuth });

    try {
        const mail = new MailComposer({
            from: payload.from,
            to: payload.to?.join(', '),
            cc: payload?.cc?.join(', '),
            bcc: payload?.bcc?.join(', '),
            replyTo: payload?.replyTo || "",
            subject: payload?.subject || "No Subject",
            text: payload?.body || "",
            attachments: payload?.attachments?.map((file) => ({
                filename: file.filename,
                content: file.content,
                contentType: file.mimeType,
            })),
        });

        const compiled = await mail.compile().build();
        const raw = Buffer.from(compiled)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

        const result = await gmail.users.messages.send({
            userId: "me",
            requestBody: { raw },
        });

        const record = await saveOutboundEmail(payload);

        return res.status(200).json({
            success: true,
            message: "Email sent and recorded",
            gmailResponse: result.data,
            outboundRecord: record,
        });
    } catch (err) {
        return handleError(filePath, "sendEmail", res, err, "Sending Email");
    }
};

const emailOps = {
    sendEmail,
    fetchEmails,
    fetchEmailsUtil,
    fetchUniqueEmails,
    fetchEmailsDate,
    fetchEmailsDateUtil,
    updateIsViewed,
    draftEmail,
    saveDraftMail,
    saveOutboundEmail,
    saveInboundEmails,
};

export default emailOps;