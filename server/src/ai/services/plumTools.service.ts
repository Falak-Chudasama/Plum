import { google } from "googleapis";
import MailComposer from "nodemailer/lib/mail-composer";
import mongoose from "mongoose";
import models from "../../models/models";
import Note from "../../models/note.models";
import CategoryModel from "../../models/category";
import Mailbox from "../../models/mailbox.models";
import categoryOps from "../../controllers/category.controllers";
import emailOps from "../../controllers/email.controllers";
import { syncNoteWithBasket } from "../../controllers/contextNote.controllers";
import { createOAuthClientForMailbox } from "../../middlewares/googleAuth.middlewares";
import { categorizeEmail, categorizeEmails } from "./categorizer.service";
import { craftEmail } from "./emailCrafter.service";
import { RetrievedNote } from "./contextNoteRag.service";
import logger from "../../utils/logger.utils";
import { formatDateTime } from "../../utils/utils";

export interface PlumToolContext {
    userEmail: string;
    activeMailbox: string;
    fullName: string;
    relevantNotes: RetrievedNote[];
    conversationContext: string;
}

export interface PlumToolExecutionResult {
    success: boolean;
    label: string;
    summary: string;
    data: Record<string, any>;
    craftedMail?: any;
    categoriesChanged?: boolean;
    notesChanged?: boolean;
    emailsChanged?: boolean;
    tokenExpired?: boolean;
    mailboxEmail?: string;
    terminate?: boolean;
}

function isGoogleAuthFailure(err: any): boolean {
    const status = err?.code || err?.status || err?.response?.status;
    const raw = `${err?.message || ""} ${JSON.stringify(err?.response?.data || "")}`.toLowerCase();
    return (
        status === 401 ||
        raw.includes("invalid_grant") ||
        raw.includes("invalid_token") ||
        raw.includes("no google credentials") ||
        raw.includes("invalid credentials") ||
        raw.includes("token has been expired or revoked")
    );
}

export const PLUM_AGENT_TOOLS = [
    {
        type: "function",
        function: {
            name: "search_emails",
            description:
                "Search or list the user's inbound, sent, or draft emails. Use for finding emails from a person, checking unread emails, summarizing today's or recent mail, or inspecting drafts.",
            parameters: {
                type: "object",
                properties: {
                    scope: {
                        type: "string",
                        enum: ["all", "inbound", "outbound", "sent", "draft"],
                        description: "Which emails to search. Use 'all' for general queries, 'inbound' for received mail, 'sent' or 'draft' for outbound.",
                    },
                    query: {
                        type: "string",
                        description: "Optional keyword, sender name, email address, or topic to match across sender, subject, and body.",
                    },
                    category: {
                        type: "string",
                        description: "Optional category name filter such as Academic, Session, Deadline, Opportunity, Finance, Other.",
                    },
                    unread_only: {
                        type: "boolean",
                        description: "Set true to only return unread inbound emails.",
                    },
                    date_range: {
                        type: "string",
                        enum: ["today", "yesterday", "last_7_days", "last_30_days", "all"],
                        description: "Time window filter. Use 'today' for today's emails, 'last_7_days' for this week, or 'all'.",
                    },
                    limit: {
                        type: "integer",
                        description: "Max number of emails to return (1-20). Default 10.",
                    },
                },
                required: [],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "read_email",
            description: "Read the complete full text body and metadata of a specific email using its email_id from search_emails.",
            parameters: {
                type: "object",
                properties: {
                    email_id: {
                        type: "string",
                        description: "The exact email ID returned by search_emails.",
                    },
                },
                required: ["email_id"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "draft_email",
            description:
                "Compose or refine an email draft. Use when the user asks to write, draft, compose, or reply to an email, or save a draft.",
            parameters: {
                type: "object",
                properties: {
                    instruction: {
                        type: "string",
                        description: "Clear single-line summary of what the email should say and its tone.",
                    },
                    to: {
                        type: "string",
                        description: "Optional comma-separated recipient email address(es) if known.",
                    },
                    subject: {
                        type: "string",
                        description: "Optional email subject line.",
                    },
                    save_to_drafts: {
                        type: "boolean",
                        description: "Set true if the user explicitly asked to save the email as a draft in Drafts.",
                    },
                },
                required: ["instruction"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "send_email",
            description:
                "Send a real email right now via Gmail OAuth. Call ONLY when the user explicitly commands to send the email AND you know the recipient email address.",
            parameters: {
                type: "object",
                properties: {
                    to: {
                        type: "string",
                        description: "Comma-separated valid recipient email address(es).",
                    },
                    subject: {
                        type: "string",
                        description: "Email subject line.",
                    },
                    instruction: {
                        type: "string",
                        description: "What the email should say so it is composed cleanly with the user's signature and sent.",
                    },
                    category: {
                        type: "string",
                        description: "Optional category tag such as Academic, Work, Other.",
                    },
                },
                required: ["to", "subject", "instruction"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "sync_gmail",
            description:
                "Fetch the latest emails live from Gmail for the active mailbox and auto-categorize new messages.",
            parameters: {
                type: "object",
                properties: {
                    max_results: {
                        type: "integer",
                        description: "Number of recent inbox messages to check (1-50, default 25).",
                    },
                },
                required: [],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "manage_categories",
            description:
                "List, create, update, or delete custom email categories for auto-tagging the inbox.",
            parameters: {
                type: "object",
                properties: {
                    action: {
                        type: "string",
                        enum: ["list", "create", "update", "delete"],
                        description: "Category action to execute.",
                    },
                    name: {
                        type: "string",
                        description: "Category name (required for create, update, delete).",
                    },
                    description: {
                        type: "string",
                        description: "Keywords or description for AI categorization matching.",
                    },
                    color: {
                        type: "string",
                        description: "Optional hex color like #B266E6, #10B981, #3B82F6, #F59E0B, #EF4444.",
                    },
                },
                required: ["action"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "recategorize_emails",
            description:
                "Run AI categorization on uncategorized emails or assign a specific category to an email.",
            parameters: {
                type: "object",
                properties: {
                    email_id: {
                        type: "string",
                        description: "Optional specific email ID to recategorize or assign.",
                    },
                    category: {
                        type: "string",
                        description: "Optional exact category name when setting category on email_id.",
                    },
                },
                required: [],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "mark_emails_read",
            description: "Mark one specific email or all unread inbound emails in the active mailbox as read.",
            parameters: {
                type: "object",
                properties: {
                    email_id: {
                        type: "string",
                        description: "Optional specific email ID to mark as read.",
                    },
                    mark_all_unread: {
                        type: "boolean",
                        description: "Set true to mark all unread emails in the active mailbox as read.",
                    },
                },
                required: [],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "manage_notes",
            description:
                "List, search, create, or delete personal Context Notes used as persistent RAG memory.",
            parameters: {
                type: "object",
                properties: {
                    action: {
                        type: "string",
                        enum: ["list", "search", "create", "delete"],
                        description: "Note operation to execute.",
                    },
                    title: {
                        type: "string",
                        description: "Short note title (for create).",
                    },
                    content: {
                        type: "string",
                        description: "Fact or personal context to save (for create).",
                    },
                    tags: {
                        type: "string",
                        description: "Optional comma-separated tags (for create).",
                    },
                    query: {
                        type: "string",
                        description: "Search keyword (for search).",
                    },
                    note_id: {
                        type: "string",
                        description: "Note ID (for delete).",
                    },
                },
                required: ["action"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "respond_to_user",
            description:
                "Finish tool execution and stream the final answer to the user. Call this for general chat or once all requested tool actions are done.",
            parameters: {
                type: "object",
                properties: {
                    status: {
                        type: "string",
                        description: "Short 1-3 word completion status like ready or done.",
                    },
                },
                required: ["status"],
            },
        },
    },
];

function escapeRegex(text: string): string {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

function getDateCandidates(date: Date): { day: string[]; month: string[]; year: string } {
    const dayNum = date.getDate();
    const monthFull = date.toLocaleString("en-US", { month: "long" });
    const monthShort = monthFull.slice(0, 3);
    const monthNum = date.getMonth() + 1;
    return {
        day: [String(dayNum), String(dayNum).padStart(2, "0")],
        month: [monthFull, monthShort, String(monthNum), String(monthNum).padStart(2, "0")],
        year: String(date.getFullYear()),
    };
}

function getInboundTimestampMs(doc: any): number {
    if (doc.timestamp) {
        const ts = Date.parse(doc.timestamp);
        if (!Number.isNaN(ts)) return ts;
    }
    if (doc.parsedDate?.year && doc.parsedDate?.month && doc.parsedDate?.day) {
        const parsed = Date.parse(
            `${doc.parsedDate.month} ${doc.parsedDate.day}, ${doc.parsedDate.year} ${doc.parsedDate.time || "00:00:00"}`
        );
        if (!Number.isNaN(parsed)) return parsed;
    }
    if (doc.createdAt) {
        const created = new Date(doc.createdAt).getTime();
        if (!Number.isNaN(created)) return created;
    }
    return 0;
}

async function getAuthorizedMailboxList(userEmail: string, activeMailbox: string): Promise<string[]> {
    const normUser = userEmail.toLowerCase().trim();
    const normActive = (activeMailbox || userEmail).toLowerCase().trim();
    const set = new Set<string>([normUser, normActive]);
    try {
        const mailboxes = await Mailbox.find({
            $or: [
                { userEmail: new RegExp(`^${escapeRegex(normUser)}$`, "i") },
                { email: new RegExp(`^${escapeRegex(normUser)}$`, "i") },
            ],
        })
            .select("email userEmail")
            .lean();
        for (const m of mailboxes) {
            if (m.email) set.add(String(m.email).toLowerCase().trim());
            if (m.userEmail) set.add(String(m.userEmail).toLowerCase().trim());
        }
    } catch (_) {}
    return Array.from(set);
}

async function execSearchEmails(args: any, ctx: PlumToolContext): Promise<PlumToolExecutionResult> {
    const scope = ["all", "inbound", "outbound", "sent", "draft"].includes(args.scope) ? args.scope : "all";
    const dateRange = ["today", "yesterday", "last_7_days", "last_30_days", "all"].includes(args.date_range)
        ? args.date_range
        : "all";
    const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 20);
    const queryStr = typeof args.query === "string" ? args.query.trim() : "";
    const categoryStr = typeof args.category === "string" ? args.category.trim() : "";
    const unreadOnly = Boolean(args.unread_only);
    const mailbox = ctx.activeMailbox;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
    const weekAgo = new Date(startOfToday.getTime() - 7 * 86400000);
    const monthAgo = new Date(startOfToday.getTime() - 30 * 86400000);

    const results: any[] = [];

    // Inbound
    if (scope === "all" || scope === "inbound") {
        const inboundFilter: Record<string, any> = {
            email: new RegExp(`^${escapeRegex(mailbox)}$`, "i"),
        };
        const andConditions: any[] = [];

        if (unreadOnly) {
            andConditions.push({ isViewed: false });
        }
        if (categoryStr) {
            andConditions.push({ categories: { $in: [new RegExp(`^${escapeRegex(categoryStr)}$`, "i")] } });
        }
        if (queryStr) {
            const rx = { $regex: escapeRegex(queryStr), $options: "i" };
            andConditions.push({
                $or: [
                    { senderEmail: rx },
                    { senderName: rx },
                    { to: rx },
                    { subject: rx },
                    { snippet: rx },
                    { bodyText: rx },
                ],
            });
        }
        if (dateRange === "today") {
            const c = getDateCandidates(now);
            andConditions.push({
                "parsedDate.day": { $in: c.day },
                "parsedDate.month": { $in: c.month },
                "parsedDate.year": c.year,
            });
        } else if (dateRange === "yesterday") {
            const c = getDateCandidates(startOfYesterday);
            andConditions.push({
                "parsedDate.day": { $in: c.day },
                "parsedDate.month": { $in: c.month },
                "parsedDate.year": c.year,
            });
        }

        if (andConditions.length > 0) {
            inboundFilter.$and = andConditions;
        }

        // Fetch slightly more before chronological timestamp filtering for multi-day ranges
        const rawInbound = await models.InboundEmail.find(inboundFilter)
            .sort({ createdAt: -1 })
            .limit(dateRange === "last_7_days" || dateRange === "last_30_days" ? 80 : limit)
            .lean();

        for (const item of rawInbound) {
            const tsMs = getInboundTimestampMs(item);
            if (dateRange === "last_7_days" && tsMs && tsMs < weekAgo.getTime()) continue;
            if (dateRange === "last_30_days" && tsMs && tsMs < monthAgo.getTime()) continue;

            results.push({
                id: String(item.id || item._id),
                direction: "inbound",
                status: "received",
                from: item.senderName ? `${item.senderName} <${item.senderEmail}>` : item.senderEmail,
                to: item.to || mailbox,
                subject: item.subject || "No Subject",
                date: item.parsedDate
                    ? `${item.parsedDate.weekday || ""} ${item.parsedDate.day || ""} ${item.parsedDate.month || ""} ${item.parsedDate.year || ""} ${item.parsedDate.time || ""}`.trim()
                    : item.timestamp || "",
                categories: item.categories || [],
                isRead: Boolean(item.isViewed),
                preview: (item.bodyText || item.snippet || "").replace(/\s+/g, " ").trim().slice(0, 380),
                sortTs: tsMs,
            });
        }
    }

    // Outbound
    if (!unreadOnly && ["all", "outbound", "sent", "draft"].includes(scope)) {
        const outboundFilter: Record<string, any> = {
            from: new RegExp(`^${escapeRegex(mailbox)}$`, "i"),
        };
        if (scope === "sent") outboundFilter.status = "sent";
        if (scope === "draft") outboundFilter.status = "draft";
        if (categoryStr) outboundFilter.category = new RegExp(`^${escapeRegex(categoryStr)}$`, "i");
        if (queryStr) {
            const rx = { $regex: escapeRegex(queryStr), $options: "i" };
            outboundFilter.$or = [{ to: rx }, { subject: rx }, { body: rx }];
        }
        if (dateRange === "today") {
            outboundFilter.createdAt = { $gte: startOfToday };
        } else if (dateRange === "yesterday") {
            outboundFilter.createdAt = { $gte: startOfYesterday, $lt: startOfToday };
        } else if (dateRange === "last_7_days") {
            outboundFilter.createdAt = { $gte: weekAgo };
        } else if (dateRange === "last_30_days") {
            outboundFilter.createdAt = { $gte: monthAgo };
        }

        const rawOutbound = await models.OutboundEmail.find(outboundFilter)
            .sort({ updatedAt: -1, createdAt: -1 })
            .limit(limit)
            .lean();

        for (const item of rawOutbound) {
            const dt = (item as any).sentAt || (item as any).createdAt;
            results.push({
                id: String(item._id),
                direction: "outbound",
                status: item.status || "sent",
                from: item.from,
                to: Array.isArray(item.to) ? item.to.join(", ") : item.to,
                subject: item.subject || "No Subject",
                date: dt ? new Date(dt).toLocaleString() : "",
                categories: item.category ? [item.category] : [],
                isRead: true,
                preview: (item.body || "").replace(/\s+/g, " ").trim().slice(0, 380),
                sortTs: dt ? new Date(dt).getTime() : 0,
            });
        }
    }

    results.sort((a, b) => (b.sortTs || 0) - (a.sortTs || 0));
    const trimmed = results.slice(0, limit).map(({ sortTs, ...rest }) => rest);

    return {
        success: true,
        label: `Found ${trimmed.length} email${trimmed.length === 1 ? "" : "s"}`,
        summary: `Searched ${scope} emails in ${mailbox}${queryStr ? ` matching "${queryStr}"` : ""}${dateRange !== "all" ? ` (${dateRange})` : ""}`,
        data: {
            mailbox,
            count: trimmed.length,
            emails: trimmed,
        },
    };
}

async function execReadEmail(args: any, ctx: PlumToolContext): Promise<PlumToolExecutionResult> {
    const emailId = String(args.email_id || "").trim();
    if (!emailId) {
        return { success: false, label: "Missing email ID", summary: "email_id is required", data: { error: "Missing email_id" } };
    }

    const allowed = await getAuthorizedMailboxList(ctx.userEmail, ctx.activeMailbox);
    const allowedRegex = allowed.map((e) => new RegExp(`^${escapeRegex(e)}$`, "i"));

    const inboundQuery: any = mongoose.Types.ObjectId.isValid(emailId)
        ? { $or: [{ id: emailId }, { _id: new mongoose.Types.ObjectId(emailId) }], email: { $in: allowedRegex } }
        : { id: emailId, email: { $in: allowedRegex } };

    const inbound = await models.InboundEmail.findOne(inboundQuery).lean();
    if (inbound) {
        return {
            success: true,
            label: `Read "${inbound.subject || "Email"}"`,
            summary: `Loaded full body from ${inbound.senderEmail}`,
            data: {
                id: String(inbound.id || inbound._id),
                direction: "inbound",
                from: inbound.senderName ? `${inbound.senderName} <${inbound.senderEmail}>` : inbound.senderEmail,
                to: inbound.to || inbound.email,
                subject: inbound.subject,
                date: inbound.timestamp || "",
                categories: inbound.categories || [],
                attachments: (inbound.attachments || []).map((a: any) => a.filename).filter(Boolean),
                body: (inbound.bodyText || inbound.snippet || "").slice(0, 4000),
            },
        };
    }

    if (mongoose.Types.ObjectId.isValid(emailId)) {
        const outbound = await models.OutboundEmail.findOne({
            _id: new mongoose.Types.ObjectId(emailId),
            from: { $in: allowedRegex },
        }).lean();

        if (outbound) {
            return {
                success: true,
                label: `Read "${outbound.subject || "Outbound Email"}"`,
                summary: `Loaded ${outbound.status} message`,
                data: {
                    id: String(outbound._id),
                    direction: "outbound",
                    status: outbound.status,
                    from: outbound.from,
                    to: outbound.to,
                    subject: outbound.subject,
                    body: (outbound.body || "").slice(0, 4000),
                },
            };
        }
    }

    return {
        success: false,
        label: "Email not found",
        summary: `No email found with ID ${emailId}`,
        data: { error: "Email not found" },
    };
}

async function execDraftEmail(args: any, ctx: PlumToolContext): Promise<PlumToolExecutionResult> {
    const instruction = String(args.instruction || "").trim();
    if (!instruction) {
        return { success: false, label: "Draft failed", summary: "Draft instruction required", data: { error: "Missing instruction" } };
    }

    const crafted = await craftEmail(
        instruction,
        ctx.conversationContext,
        ctx.activeMailbox,
        ctx.fullName,
        args.subject ? String(args.subject) : undefined,
        undefined,
        args.to ? String(args.to).split(",").map((s: string) => s.trim()).filter(Boolean) : undefined,
        ctx.relevantNotes
    );

    const saveToDrafts = Boolean(args.save_to_drafts);
    let savedDraftId: string | undefined;

    if (saveToDrafts) {
        const record = await emailOps.saveDraftMail({
            from: ctx.activeMailbox,
            to: crafted.to,
            cc: crafted.cc,
            bcc: crafted.bcc,
            subject: crafted.subject,
            body: crafted.body,
            category: Array.isArray(crafted.category) ? crafted.category[0] : "Other",
            status: "draft",
        } as any);
        savedDraftId = String((record as any)._id);
        crafted.status = "draft";
    }

    return {
        success: true,
        label: saveToDrafts ? "Saved draft" : "Prepared draft",
        summary: `Draft "${crafted.subject}"${crafted.to.length ? ` to ${crafted.to.join(", ")}` : ""}`,
        craftedMail: {
            ...crafted,
            _id: savedDraftId,
        },
        emailsChanged: saveToDrafts,
        data: {
            savedToDrafts: saveToDrafts,
            draftId: savedDraftId,
            from: crafted.from,
            to: crafted.to,
            subject: crafted.subject,
            body: crafted.body,
        },
    };
}

async function execSendEmail(args: any, ctx: PlumToolContext): Promise<PlumToolExecutionResult> {
    const toRaw = String(args.to || "").trim();
    const toList = toRaw
        .split(/[,;\s]+/)
        .map((e) => e.trim())
        .filter((e) => e.includes("@"));

    if (toList.length === 0) {
        return {
            success: false,
            label: "Missing valid recipient",
            summary: "No valid email address provided to send to.",
            data: { error: "Please provide a valid recipient email address." },
        };
    }

    const instruction = String(args.instruction || args.subject || "").trim();
    const crafted = await craftEmail(
        instruction || `Write email about ${args.subject || "this topic"}`,
        ctx.conversationContext,
        ctx.activeMailbox,
        ctx.fullName,
        args.subject ? String(args.subject) : undefined,
        undefined,
        toList,
        ctx.relevantNotes
    );

    const subject = String(args.subject || crafted.subject || "No Subject").trim();
    const body = crafted.body;
    const category = String(args.category || "Other").trim();

    try {
        const { client: oauthClient, mailboxEmail } = await createOAuthClientForMailbox(ctx.userEmail, ctx.activeMailbox);
        const gmail = google.gmail({ version: "v1", auth: oauthClient });

        const mail = new MailComposer({
            from: mailboxEmail,
            to: toList.join(", "),
            subject,
            text: body,
        });

        const compiled = await mail.compile().build();
        const raw = Buffer.from(compiled)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

        const gmailRes = await gmail.users.messages.send({
            userId: "me",
            requestBody: { raw },
        });

        const saved = await emailOps.saveOutboundEmail({
            from: mailboxEmail,
            to: toList,
            cc: [],
            bcc: [],
            subject,
            body,
            category,
            status: "sent",
        } as any);

        return {
            success: true,
            label: `Sent to ${toList[0]}`,
            summary: `Sent "${subject}" from ${mailboxEmail}`,
            emailsChanged: true,
            data: {
                sent: true,
                messageId: gmailRes.data?.id,
                recordId: String((saved as any)._id),
                from: mailboxEmail,
                to: toList,
                subject,
            },
        };
    } catch (err: any) {
        logger.error(`[PlumTools] send_email failed: ${err.message}`);
        const tokenExpired = isGoogleAuthFailure(err);
        if (tokenExpired) {
            await Mailbox.updateMany({ email: ctx.activeMailbox }, { $set: { status: 'expired' } }).catch(() => {});
        }
        return {
            success: false,
            label: "Send failed",
            summary: err.message || "Could not send email via Gmail OAuth",
            tokenExpired,
            mailboxEmail: ctx.activeMailbox,
            data: {
                error: err.message || "Gmail authorization missing or expired. Reauthorize in Accounts.",
            },
        };
    }
}

async function execSyncGmail(args: any, ctx: PlumToolContext): Promise<PlumToolExecutionResult> {
    const maxResults = Math.min(Math.max(Number(args.max_results) || 25, 1), 50);
    try {
        const { client: oauthClient, mailboxEmail } = await createOAuthClientForMailbox(ctx.userEmail, ctx.activeMailbox);
        const rawEmails = await emailOps.fetchEmailsUtil(oauthClient, maxResults);
        if (!rawEmails) {
            return { success: false, label: "Sync failed", summary: "Could not fetch emails from Gmail", data: { error: "Gmail fetch returned empty" } };
        }

        const uniqueEmails = await emailOps.fetchUniqueEmails(rawEmails as any);
        for (const em of uniqueEmails) {
            em.email = mailboxEmail;
        }

        let categorized: any[] = [];
        if (uniqueEmails.length > 0) {
            categorized = await categorizeEmails(uniqueEmails as any, mailboxEmail);
            await emailOps.saveInboundEmails(categorized);
        }

        await Mailbox.updateOne(
            { userEmail: ctx.userEmail, email: mailboxEmail },
            { $set: { lastSyncAt: new Date() } }
        );

        return {
            success: true,
            label: categorized.length > 0 ? `Synced ${categorized.length} new email${categorized.length === 1 ? "" : "s"}` : "Inbox up to date",
            summary: `Checked ${rawEmails.length} inbox emails for ${mailboxEmail}; ${categorized.length} new saved`,
            emailsChanged: categorized.length > 0,
            data: {
                mailbox: mailboxEmail,
                checked: rawEmails.length,
                newCount: categorized.length,
                newEmails: categorized.slice(0, 8).map((e) => ({
                    id: e.id,
                    from: e.senderName || e.senderEmail,
                    subject: e.subject,
                    categories: e.categories,
                })),
            },
        };
    } catch (err: any) {
        logger.error(`[PlumTools] sync_gmail failed: ${err.message}`);
        const tokenExpired = isGoogleAuthFailure(err);
        if (tokenExpired) {
            await Mailbox.updateMany({ email: ctx.activeMailbox }, { $set: { status: 'expired' } }).catch(() => {});
        }
        return {
            success: false,
            label: "Gmail sync failed",
            summary: err.message || "Gmail credentials may need renewal",
            tokenExpired,
            mailboxEmail: ctx.activeMailbox,
            data: { error: err.message || "Gmail sync failed" },
        };
    }
}

async function execManageCategories(args: any, ctx: PlumToolContext): Promise<PlumToolExecutionResult> {
    const action = String(args.action || "list").toLowerCase();
    const userEmail = ctx.userEmail;

    if (action === "list") {
        const cats = await categoryOps.findUserCategories(userEmail);
        return {
            success: true,
            label: `Listed ${cats.length} categories`,
            summary: "Loaded custom categories",
            data: {
                categories: cats.map((c: any) => ({
                    name: c.category,
                    description: c.description || "",
                    color: c.color || "#B266E6",
                })),
            },
        };
    }

    const name = String(args.name || "").trim();
    if (!name) {
        return { success: false, label: "Missing category name", summary: "Category name is required", data: { error: "Missing category name" } };
    }

    if (action === "create") {
        const color = String(args.color || "#B266E6").trim();
        const description = String(args.description || "").trim();
        try {
            const created = await categoryOps.create(
                {
                    category: name,
                    description,
                    color,
                    alert: false,
                    email: userEmail,
                } as any,
                userEmail
            );
            return {
                success: true,
                label: `Created category "${name}"`,
                summary: `Added category ${name}`,
                categoriesChanged: true,
                data: { created: { name: created?.category || name, description, color } },
            };
        } catch (err: any) {
            return { success: false, label: "Create category failed", summary: err.message, data: { error: err.message } };
        }
    }

    if (action === "update") {
        const existing = await CategoryModel.findOne({
            email: userEmail,
            category: new RegExp(`^${escapeRegex(name)}$`, "i"),
        });
        if (!existing) {
            return { success: false, label: "Category not found", summary: `Category "${name}" does not exist`, data: { error: "Category not found" } };
        }
        const updated = await categoryOps.edit(
            {
                _id: String(existing._id),
                category: existing.category,
                description: args.description !== undefined ? String(args.description) : existing.description,
                color: args.color !== undefined ? String(args.color) : existing.color,
                alert: existing.alert,
                email: userEmail,
            } as any,
            userEmail
        );
        return {
            success: true,
            label: `Updated category "${existing.category}"`,
            summary: `Updated ${existing.category}`,
            categoriesChanged: true,
            data: { updated: { name: updated?.category, description: updated?.description, color: updated?.color } },
        };
    }

    if (action === "delete") {
        const deleted = await categoryOps.deleteCategory(name, userEmail);
        if (!deleted) {
            return { success: false, label: "Category not found", summary: `Category "${name}" not found`, data: { error: "Category not found" } };
        }
        return {
            success: true,
            label: `Deleted category "${name}"`,
            summary: `Removed ${name}`,
            categoriesChanged: true,
            data: { deleted: name },
        };
    }

    return { success: false, label: "Unknown category action", summary: `Unsupported action ${action}`, data: { error: "Unsupported action" } };
}

async function execRecategorizeEmails(args: any, ctx: PlumToolContext): Promise<PlumToolExecutionResult> {
    const emailId = args.email_id ? String(args.email_id).trim() : "";
    const targetCategory = args.category ? String(args.category).trim() : "";

    if (emailId) {
        const allowed = await getAuthorizedMailboxList(ctx.userEmail, ctx.activeMailbox);
        const allowedRegex = allowed.map((e) => new RegExp(`^${escapeRegex(e)}$`, "i"));
        const emailDoc = await models.InboundEmail.findOne({ id: emailId, email: { $in: allowedRegex } });
        if (!emailDoc) {
            return { success: false, label: "Email not found", summary: `Could not find email ${emailId}`, data: { error: "Email not found" } };
        }

        const finalCategory = targetCategory || (await categorizeEmail(emailDoc as any, ctx.activeMailbox));
        await models.InboundEmail.updateOne({ _id: emailDoc._id }, { $set: { categories: [finalCategory] } });

        return {
            success: true,
            label: `Tagged as ${finalCategory}`,
            summary: `Set category of "${emailDoc.subject}" to ${finalCategory}`,
            emailsChanged: true,
            data: { emailId, subject: emailDoc.subject, category: finalCategory },
        };
    }

    const toClassify = await models.InboundEmail.find({
        email: new RegExp(`^${escapeRegex(ctx.activeMailbox)}$`, "i"),
        $or: [{ categories: { $size: 0 } }, { categories: "Other" }, { categories: { $exists: false } }],
    })
        .sort({ createdAt: -1 })
        .limit(20);

    if (toClassify.length === 0) {
        return {
            success: true,
            label: "All emails categorized",
            summary: "No uncategorized emails found",
            data: { updated: 0, checked: 0 },
        };
    }

    let updated = 0;
    for (const em of toClassify) {
        const cat = await categorizeEmail(em as any, ctx.activeMailbox);
        if (cat && cat !== "Other") {
            await models.InboundEmail.updateOne({ _id: em._id }, { $set: { categories: [cat] } });
            updated++;
        }
    }

    return {
        success: true,
        label: `Categorized ${updated} email${updated === 1 ? "" : "s"}`,
        summary: `Checked ${toClassify.length} emails and updated ${updated}`,
        emailsChanged: updated > 0,
        data: { updated, checked: toClassify.length },
    };
}

async function execMarkEmailsRead(args: any, ctx: PlumToolContext): Promise<PlumToolExecutionResult> {
    const allowed = await getAuthorizedMailboxList(ctx.userEmail, ctx.activeMailbox);
    const allowedRegex = allowed.map((e) => new RegExp(`^${escapeRegex(e)}$`, "i"));

    if (args.email_id) {
        const emailId = String(args.email_id).trim();
        const res = await models.InboundEmail.updateOne(
            { id: emailId, email: { $in: allowedRegex } },
            { $set: { isViewed: true } }
        );
        return {
            success: res.matchedCount > 0,
            label: res.matchedCount > 0 ? "Marked as read" : "Email not found",
            summary: res.matchedCount > 0 ? `Marked email ${emailId} as read` : `Email ${emailId} not found`,
            emailsChanged: res.modifiedCount > 0,
            data: { matched: res.matchedCount, modified: res.modifiedCount },
        };
    }

    if (args.mark_all_unread) {
        const res = await models.InboundEmail.updateMany(
            { email: new RegExp(`^${escapeRegex(ctx.activeMailbox)}$`, "i"), isViewed: false },
            { $set: { isViewed: true } }
        );
        return {
            success: true,
            label: `Marked ${res.modifiedCount} as read`,
            summary: `Marked ${res.modifiedCount} unread emails in ${ctx.activeMailbox} as read`,
            emailsChanged: res.modifiedCount > 0,
            data: { modified: res.modifiedCount, mailbox: ctx.activeMailbox },
        };
    }

    return { success: false, label: "Specify email or mark_all_unread", summary: "No target specified", data: { error: "Provide email_id or mark_all_unread=true" } };
}

async function execManageNotes(args: any, ctx: PlumToolContext): Promise<PlumToolExecutionResult> {
    const action = String(args.action || "list").toLowerCase();
    const userEmail = ctx.activeMailbox || ctx.userEmail;

    if (action === "list") {
        const notes = await Note.find({
            application: "plum",
            $or: [{ userEmail }, { userEmail: ctx.userEmail }, { userEmail: { $exists: false } }, { userEmail: null }],
        })
            .sort({ updated_at: -1, created_at: -1 })
            .limit(20)
            .lean();
        return {
            success: true,
            label: `Listed ${notes.length} note${notes.length === 1 ? "" : "s"}`,
            summary: "Retrieved saved context notes",
            data: {
                notes: notes.map((n: any) => ({
                    id: String(n._id),
                    title: n.title,
                    content: n.content,
                    tags: n.tags || [],
                })),
            },
        };
    }

    if (action === "search") {
        const q = String(args.query || "").trim();
        const rx = q ? new RegExp(escapeRegex(q), "i") : null;
        const andFilter: any[] = [{ $or: [{ userEmail }, { userEmail: ctx.userEmail }] }];
        if (rx) {
            andFilter.push({ $or: [{ title: rx }, { content: rx }, { tags: rx }] });
        }
        const notes = await Note.find({
            application: "plum",
            $and: andFilter,
        })
            .limit(10)
            .lean();
        return {
            success: true,
            label: `Found ${notes.length} note${notes.length === 1 ? "" : "s"}`,
            summary: `Searched notes for "${q}"`,
            data: {
                notes: notes.map((n: any) => ({
                    id: String(n._id),
                    title: n.title,
                    content: n.content,
                    tags: n.tags || [],
                })),
            },
        };
    }

    if (action === "create") {
        const title = String(args.title || "Saved Context").trim();
        const content = String(args.content || "").trim();
        if (!content) {
            return { success: false, label: "Missing note content", summary: "Note content is required", data: { error: "Missing content" } };
        }
        const tags = args.tags
            ? String(args.tags).split(",").map((t) => t.trim()).filter(Boolean)
            : [];
        const now = formatDateTime();
        const note = new Note({
            title,
            content,
            tags,
            metadata: { category: tags[0] || "general" },
            application: "plum",
            created_at: now,
            updated_at: now,
            userEmail,
        });
        await note.save();
        await syncNoteWithBasket("upsert", note._id.toString(), note);

        return {
            success: true,
            label: `Saved note "${title}"`,
            summary: `Indexed note "${title}"`,
            notesChanged: true,
            data: { id: note._id.toString(), title, content, tags },
        };
    }

    if (action === "delete") {
        const noteId = String(args.note_id || "").trim();
        const titleLookup = String(args.title || args.query || (!mongoose.Types.ObjectId.isValid(noteId) ? noteId : "")).trim();
        const ownerScope = {
            application: "plum",
            $or: [{ userEmail }, { userEmail: ctx.userEmail }, { userEmail: { $exists: false } }, { userEmail: null }],
        };

        let targetNote: any = null;
        if (noteId && mongoose.Types.ObjectId.isValid(noteId)) {
            targetNote = await Note.findOneAndDelete({ _id: noteId, ...ownerScope });
        } else if (titleLookup) {
            targetNote = await Note.findOneAndDelete({
                ...ownerScope,
                title: new RegExp(`^${escapeRegex(titleLookup)}$`, "i"),
            });
        } else {
            return { success: false, label: "Note identifier required", summary: "Provide note_id or title", data: { error: "Provide note_id or title" } };
        }

        if (!targetNote) {
            return { success: false, label: "Note not found", summary: "Note not found", data: { error: "Note not found" } };
        }
        const deletedId = targetNote._id.toString();
        await syncNoteWithBasket("delete", deletedId);
        return {
            success: true,
            label: `Deleted note "${targetNote.title}"`,
            summary: `Deleted note "${targetNote.title}"`,
            notesChanged: true,
            data: { deletedId, title: targetNote.title },
        };
    }

    return { success: false, label: "Unsupported note action", summary: `Unknown action ${action}`, data: { error: "Unsupported action" } };
}

export async function executePlumTool(
    toolName: string,
    rawArgs: string | Record<string, any>,
    ctx: PlumToolContext
): Promise<PlumToolExecutionResult> {
    let args: Record<string, any> = {};
    if (typeof rawArgs === "string") {
        try {
            args = JSON.parse(rawArgs || "{}");
        } catch {
            args = {};
        }
    } else if (rawArgs && typeof rawArgs === "object") {
        args = rawArgs;
    }

    logger.info(`[PlumTools] Executing tool=${toolName} user=${ctx.userEmail} mailbox=${ctx.activeMailbox}`);

    switch (toolName) {
        case "search_emails":
            return execSearchEmails(args, ctx);
        case "read_email":
            return execReadEmail(args, ctx);
        case "draft_email":
            return execDraftEmail(args, ctx);
        case "send_email":
            return execSendEmail(args, ctx);
        case "sync_gmail":
            return execSyncGmail(args, ctx);
        case "manage_categories":
            return execManageCategories(args, ctx);
        case "recategorize_emails":
            return execRecategorizeEmails(args, ctx);
        case "mark_emails_read":
            return execMarkEmailsRead(args, ctx);
        case "manage_notes":
            return execManageNotes(args, ctx);
        case "respond_to_user":
            return {
                success: true,
                label: "Ready",
                summary: String(args.status || "ready"),
                terminate: true,
                data: { status: args.status || "ready" },
            };
        default:
            return {
                success: false,
                label: `Unknown tool: ${toolName}`,
                summary: `Unsupported tool ${toolName}`,
                data: { error: `Unknown tool ${toolName}` },
            };
    }
}
