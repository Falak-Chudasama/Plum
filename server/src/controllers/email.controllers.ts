import { Request, Response } from "express";
import MailComposer from "nodemailer/lib/mail-composer";
import { google } from "googleapis";

import handleError, { handleErrorUtil } from "../utils/errors.utils";
import { InboundEmailType, OutboundEmailType, GoogleAuthenticatedRequest, AuthenticatedRequest } from "../types/types";
import models from "../models/models";
import Mailbox from "../models/mailbox.models";
import emailCleanser from "../utils/emailCleanser.utils";
import { categorizeEmails } from "../ai/services/categorizer.service";
import { craftEmail } from "../ai/services/emailCrafter.service";

const filePath: string = '/src/controllers/email.controllers.ts'

/**
 * Resolves and verifies that a target mailbox belongs to the user,
 * falling back to the primary mailbox or user's login email.
 */
const resolveTargetMailbox = async (userEmail: string, requestedMailbox?: string): Promise<string> => {
    if (requestedMailbox) {
        if (requestedMailbox === userEmail) return requestedMailbox;
        const mailbox = await Mailbox.findOne({ userEmail, email: requestedMailbox });
        if (mailbox) return mailbox.email;
    }
    const primary = await Mailbox.findOne({ userEmail, isPrimary: true });
    if (primary) return primary.email;
    return userEmail;
};

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

const fetchOutboundEmailsDateUtil = async (
    email: string,
    day: string,
    month: string,
    year: string
): Promise<OutboundEmailType[]> => {
    try {
        let monthIndex: number;

        if (/^\d+$/.test(month)) {
            monthIndex = Number(month) - 1;
        } else {
            monthIndex = new Date(`${month} 1, 2000`).getMonth();
        }

        if (isNaN(monthIndex)) {
            throw new Error(`Invalid month value received: "${month}"`);
        }

        const start = new Date(Number(year), monthIndex, Number(day), 0, 0, 0, 0);
        const end = new Date(Number(year), monthIndex, Number(day) + 1, 0, 0, 0, 0);

        if (isNaN(start.getTime())) {
            throw new Error(`Invalid date constructed: ${year}-${month}-${day}`);
        }

        const emails = await models.OutboundEmail.find({
            from: email,
            createdAt: {
                $gte: start,
                $lt: end
            }
        }).sort({ createdAt: -1 });

        return emails ?? [];

    } catch (err) {
        handleErrorUtil(
            filePath,
            "fetchOutboundEmailsDateUtil",
            err,
            "Fetching Outbound Emails by Date"
        );
        return [];
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

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const getMonthCandidates = (rawMonth: string | number): string[] => {
    const str = String(rawMonth).trim();
    const candidates = new Set<string>([str]);

    // Check if numeric (1-12)
    const num = parseInt(str, 10);
    if (!isNaN(num) && num >= 1 && num <= 12) {
        const full = MONTH_NAMES[num - 1];
        candidates.add(full);
        candidates.add(full.substring(0, 3));
        candidates.add(String(num));
        candidates.add(String(num).padStart(2, '0'));
        return Array.from(candidates);
    }

    // Check against month names (case-insensitive)
    for (let i = 0; i < MONTH_NAMES.length; i++) {
        const full = MONTH_NAMES[i];
        const short = full.substring(0, 3);
        if (full.toLowerCase() === str.toLowerCase() || short.toLowerCase() === str.toLowerCase()) {
            candidates.add(full);
            candidates.add(short);
            candidates.add(String(i + 1));
            candidates.add(String(i + 1).padStart(2, '0'));
            break;
        }
    }

    return Array.from(candidates);
};

const getDayCandidates = (rawDay: string | number): string[] => {
    const num = parseInt(String(rawDay), 10);
    if (isNaN(num)) return [String(rawDay).trim()];
    return [String(num), String(num).padStart(2, '0')];
};

const fetchEmailsDateUtil = async (email: string, day: string, month: string, year: string): Promise<InboundEmailType[]> => {
    try {
        const monthCandidates = getMonthCandidates(month);
        const dayCandidates = getDayCandidates(day);
        const yearCandidates = [String(year).trim()];

        const emails = await models.InboundEmail.find({
            email,
            "parsedDate.day": { $in: dayCandidates },
            "parsedDate.month": { $in: monthCandidates },
            "parsedDate.year": { $in: yearCandidates },
        }).sort({ "parsedDate.time": -1, _id: -1 });

        return emails ?? [];
    } catch (err) {
        handleErrorUtil(filePath, 'fetchEmailsDateUtil', err, 'Fetching Emails by Date');
    }
    return [];
};

// GET api.plum.com/email/fetch
const fetchEmails = async (req: Request, res: Response) => {
    const googleReq = req as GoogleAuthenticatedRequest;
    const authReq = req as AuthenticatedRequest;
    const userEmail = authReq.user.email;
    const targetMailbox = googleReq.mailbox?.email || (await resolveTargetMailbox(userEmail, req.query.mailboxEmail as string || req.headers['x-mailbox-email'] as string));
    const OAuth = googleReq.auth!;

    const numberOfEmails = Number(req.query.numberOfEmails || 10);

    try {
        const rawEmails = await fetchEmailsUtil(OAuth, numberOfEmails);

        if (!rawEmails) {
            throw Error('Could not fetch emails');
        }

        const uniqueEmails = await fetchUniqueEmails(rawEmails as any);
        for (const email of uniqueEmails) {
            email.email = targetMailbox;
        }

        let categorizedEmails: InboundEmailType[] = [];
        if (uniqueEmails.length > 0) {
            categorizedEmails = await categorizeEmails(uniqueEmails as any, targetMailbox);
            await saveInboundEmails(categorizedEmails);
        }

        // Update lastSyncAt for this mailbox
        await Mailbox.updateOne(
            { userEmail, email: targetMailbox },
            { $set: { lastSyncAt: new Date() } }
        );

        return res.status(200).json({
            emails: categorizedEmails,
            emailsCount: categorizedEmails.length,
            mailboxEmail: targetMailbox,
            success: true,
        });
    } catch (err) {
        handleError(filePath, 'fetchEmails', res, err, 'Fetching Emails via Gmail');
    }
};

// GET api.plum.com/email/fetch-by-date
const fetchEmailsDate = async (req: Request, res: Response) => {
    const userEmail = (req as AuthenticatedRequest).user.email;
    const { date, month, year, mailboxEmail } = req.body;

    try {
        const targetMailbox = await resolveTargetMailbox(
            userEmail,
            mailboxEmail || (req.headers['x-mailbox-email'] as string) || (req.query.mailboxEmail as string)
        );

        const emails = await fetchEmailsDateUtil(targetMailbox, String(date), String(month), String(year));

        if (!emails) {
            throw Error('Could not fetch emails');
        }

        return res.status(200).json({
            emails,
            emailsCount: emails.length,
            mailboxEmail: targetMailbox,
            success: true,
        });
    } catch (err) {
        handleError(filePath, 'fetchEmailsDate', res, err, 'Fetching Emails by Date via Gmail');
    }
};

// GET api.plum.com/email/fetch-outbound-by-date
const fetchOutboundEmailsDate = async (req: Request, res: Response) => {
    const userEmail = (req as AuthenticatedRequest).user.email;
    const { date, month, year, mailboxEmail } = req.body;

    try {
        const targetMailbox = await resolveTargetMailbox(
            userEmail,
            mailboxEmail || (req.headers['x-mailbox-email'] as string) || (req.query.mailboxEmail as string)
        );

        const emails = await fetchOutboundEmailsDateUtil(targetMailbox, String(date), String(month), String(year));

        if (!emails) {
            throw Error("Could not fetch outbound emails");
        }

        return res.status(200).json({
            emails,
            emailsCount: emails.length,
            mailboxEmail: targetMailbox,
            success: true,
        });

    } catch (err) {
        handleError(
            filePath,
            "fetchOutboundEmailsDate",
            res,
            err,
            "Fetching Outbound Emails by Date"
        );
    }
};

// GET api.plum.com/email/drafts
const fetchDrafts = async (req: Request, res: Response) => {
    try {
        const userEmail = (req as AuthenticatedRequest).user.email;
        const targetMailbox = await resolveTargetMailbox(
            userEmail,
            (req.headers['x-mailbox-email'] as string) || (req.query.mailboxEmail as string)
        );

        const drafts = await models.OutboundEmail.find({
            from: targetMailbox,
            status: "draft"
        }).sort({ updatedAt: -1, createdAt: -1 });

        return res.status(200).json({
            drafts: drafts ?? [],
            draftsCount: drafts?.length ?? 0,
            mailboxEmail: targetMailbox,
            success: true
        });
    } catch (err) {
        handleError(filePath, "fetchDrafts", res, err, "Fetching Draft Emails");
    }
};


// PUT api.plum.com/email/set-is-viewed
const updateIsViewed = async (req: Request, res: Response) => {
    try {
        const userEmail = (req as AuthenticatedRequest).user.email;
        const { id } = req.body;
        if (!id) {
            throw Error("Email's ID was not given");
        }

        const response = await models.InboundEmail.updateOne(
            { id, email: userEmail },
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
    } catch (err: any) {
        if (err.message && err.message.endsWith('not found')){
            handleError(filePath, 'setIsViewed', res, err, 'Setting the email as viewed (User email was not found)', 404);
        } else {
            handleError(filePath, 'setIsViewed', res, err, 'Setting the email as viewed');
        }
    }
};

// PUT api.plum.com/email/outbound/set-is-viewed
const updateOutboundIsViewed = async (req: Request, res: Response) => {
    try {
        const userEmail = (req as AuthenticatedRequest).user.email;
        const { id } = req.body;

        if (!id) {
            throw Error("Email's ID was not given");
        }

        const response = await models.OutboundEmail.updateOne(
            { id, from: userEmail },
            {
                $set: {
                    isViewed: true
                }
            }
        );

        if (response.matchedCount === 0) {
            throw Error("Email was not found");
        }

        return res.status(200).json({
            result: response,
            success: true
        });

    } catch (err: any) {
        if (err.message && err.message.endsWith("not found")) {
            handleError(
                filePath,
                "setOutboundIsViewed",
                res,
                err,
                "Setting the outbound email as viewed (User email was not found)",
                404
            );
        } else {
            handleError(
                filePath,
                "setOutboundIsViewed",
                res,
                err,
                "Setting the outbound email as viewed"
            );
        }
    }
};


// POST api.plum.com/email/draft
const draftEmail = async (req: Request, res: Response) => {
    try {
        const userEmail = (req as AuthenticatedRequest).user.email;
        const payload = req.body.email as OutboundEmailType;

        if (!payload) {
            return handleError(
                filePath,
                "draftEmail",
                res,
                "Missing required payload: `email`",
                "InvalidRequest",
                400
            );
        }

        // Enforce account ownership and resolve target mailbox
        const targetMailbox = await resolveTargetMailbox(
            userEmail,
            payload.from || (req.headers["x-mailbox-email"] as string)
        );
        payload.from = targetMailbox;

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
    const userEmail = (req as AuthenticatedRequest).user.email;
    const OAuth = googleReq.auth;
    const targetMailbox = googleReq.mailbox?.email || (await resolveTargetMailbox(userEmail, req.body?.mailboxEmail || (req.headers["x-mailbox-email"] as string)));

    const payload = req.body.email as OutboundEmailType;

    if (!payload || !payload.to?.length) {
        return handleError(
            filePath,
            "sendEmail",
            res,
            "Missing required field: at least one `to` recipient",
            "InvalidRequest",
            400
        );
    }

    // Strictly enforce sending from the authenticated mailbox
    payload.from = targetMailbox;

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
            attachments: payload?.attachments?.map((file: any) => ({
                filename: file.filename || undefined,
                content: file.content || "",
                contentType: file.mimeType || undefined,
            })) || [],
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

const generateAiDraft = async (req: Request, res: Response) => {
    try {
        const userEmail = (req as AuthenticatedRequest).user?.email;
        if (!userEmail) {
            return res.status(401).json({ success: false, error: "Unauthorized" });
        }

        const { prompt, currentSubject, currentBody, to, from } = req.body;
        if (!prompt || !prompt.trim()) {
            return res.status(400).json({ success: false, error: "Instruction prompt is required" });
        }

        const senderMailbox = from || userEmail;
        const user = await models.User.findOne({ email: userEmail }).lean();
        const userName = user ? [user.name, user.lastName].filter(Boolean).join(" ") : undefined;

        const result = await craftEmail(
            prompt.trim(),
            "",
            senderMailbox,
            userName,
            currentSubject,
            currentBody,
            to
        );

        return res.status(200).json({
            success: true,
            draft: {
                subject: result.subject,
                body: result.body,
                to: result.to,
                cc: result.cc,
                bcc: result.bcc,
            },
        });
    } catch (err: any) {
        handleErrorUtil(filePath, "generateAiDraft", err, "Generating AI draft via Basket");
        return res.status(500).json({
            success: false,
            error: err.message || "Failed to generate AI email draft",
        });
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
    fetchOutboundEmailsDate,
    updateOutboundIsViewed,
    fetchDrafts,
    draftEmail,
    saveDraftMail,
    saveOutboundEmail,
    saveInboundEmails,
    generateAiDraft,
};

export default emailOps;