import { Request, Response } from "express";
import mongoose from "mongoose";
import Chats from "../models/chat";
import Mailbox from "../models/mailbox.models";
import User from "../models/user.models";
import { handleErrorUtil } from "../utils/errors.utils";
import { formatDateTime } from "../utils/utils";
import { AuthenticatedRequest } from "../types/types";
import { handleChatPrompt, ChatMessageSender } from "../ai/services/chat.service";

const filePath = "./src/controllers/chat.controllers.ts";

function escapeRegex(text: string): string {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

async function getAuthorizedEmailsForUser(userEmail: string): Promise<string[]> {
    const norm = userEmail.toLowerCase().trim();
    const set = new Set<string>([norm]);
    try {
        const mailboxes = await Mailbox.find({
            $or: [
                { userEmail: new RegExp(`^${escapeRegex(norm)}$`, "i") },
                { email: new RegExp(`^${escapeRegex(norm)}$`, "i") },
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

function buildAuthChatFilter(authorizedEmails?: string[]) {
    if (!authorizedEmails || authorizedEmails.length === 0) {
        return { application: "plum" };
    }
    const regexes = authorizedEmails.map((e) => new RegExp(`^${escapeRegex(e)}$`, "i"));
    return {
        application: "plum",
        $or: [
            { email: { $in: regexes } },
            { mailboxEmail: { $in: regexes } },
            { email: { $exists: false } },
            { email: null },
        ],
    };
}

/**
 * Standard Multi-Chat Endpoint: GET /api/chats
 */
async function getApiChats(req: Request, res: Response) {
    try {
        const userEmail = (req as AuthenticatedRequest).user?.email;
        const authorized = userEmail ? await getAuthorizedEmailsForUser(userEmail) : undefined;
        const filter = buildAuthChatFilter(authorized);

        const chats = await Chats.find(filter)
            .select("_id session_id title updated_at created_at email mailboxEmail")
            .sort({ updated_at: -1, created_at: -1 })
            .lean();

        const formatted = chats.map((c: any) => ({
            _id: c._id.toString(),
            session_id: c.session_id || c._id.toString(),
            title: c.title || "New Chat",
            updated_at: c.updated_at || c.created_at || formatDateTime(),
            email: c.email,
            mailboxEmail: c.mailboxEmail,
        }));

        return res.status(200).json(formatted);
    } catch (err: any) {
        handleErrorUtil(filePath, "getApiChats", err, "Fetching chat threads for /api/chats");
        return res.status(500).json({ error: "Failed to fetch chat threads" });
    }
}

/**
 * GET /api/chats/:id
 */
async function getApiChatById(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const userEmail = (req as AuthenticatedRequest).user?.email;
        const chat = await getById(id, userEmail);
        if (!chat) {
            return res.status(404).json({ error: "Chat thread not found" });
        }

        return res.status(200).json(chat);
    } catch (err: any) {
        handleErrorUtil(filePath, "getApiChatById", err, "Fetching chat thread by ID");
        return res.status(500).json({ error: "Failed to fetch chat thread" });
    }
}

/**
 * DELETE /api/chats/:id
 */
async function deleteApiChat(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const userEmail = (req as AuthenticatedRequest).user?.email;
        const deleted = await del(id, userEmail);
        if (!deleted) {
            return res.status(404).json({ error: "Chat thread not found" });
        }

        return res.status(200).json({ success: true, message: "Chat thread deleted successfully" });
    } catch (err: any) {
        handleErrorUtil(filePath, "deleteApiChat", err, "Deleting chat thread");
        return res.status(500).json({ error: "Failed to delete chat thread" });
    }
}

/**
 * POST /api/chats/stream (SSE Streaming Plum Agent)
 */
async function streamChat(req: Request, res: Response) {
    const abortController = new AbortController();
    let clientClosed = false;

    res.on("close", () => {
        if (!res.writableEnded && !res.writableFinished) {
            clientClosed = true;
            abortController.abort();
        }
    });

    try {
        const userEmail =
            (req as AuthenticatedRequest).user?.email ||
            req.cookies?.gmail ||
            req.body?.email;

        if (!userEmail) {
            return res.status(401).json({ success: false, error: "Unauthorized: Please sign in to use Plum AI." });
        }

        const prompt = String(req.body?.prompt || req.body?.text || "").trim();
        if (!prompt) {
            return res.status(400).json({ success: false, error: "Prompt is required" });
        }

        const chatId = req.body?.chatId || req.body?.chat_id || null;
        const chatCount = Number(req.body?.chatCount || 0);
        const requestedMailbox =
            (req.headers["x-mailbox-email"] as string) ||
            req.body?.mailboxEmail ||
            undefined;

        let userName: string | undefined;
        let userLastName: string | undefined;
        try {
            const userRecord = await User.findOne({ email: new RegExp(`^${escapeRegex(userEmail)}$`, "i") }).lean();
            if (userRecord) {
                userName = userRecord.name || undefined;
                userLastName = userRecord.lastName || undefined;
            }
        } catch (_) {}

        res.writeHead(200, {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        });
        if (typeof (res as any).flushHeaders === "function") {
            (res as any).flushHeaders();
        }

        const sender: ChatMessageSender = {
            send: (payload: any) => {
                if (!clientClosed && !res.writableEnded) {
                    res.write(`data: ${JSON.stringify(payload)}\n\n`);
                }
            },
            isOpen: () => !clientClosed && !res.writableEnded,
        };

        await handleChatPrompt({
            prompt,
            chatCount,
            user: {
                email: userEmail,
                mailboxEmail: requestedMailbox,
                name: userName,
                lastName: userLastName,
            },
            chatId: chatId ? String(chatId) : null,
            socket: sender,
            abortSignal: abortController.signal,
        });

        if (!clientClosed && !res.writableEnded) {
            res.write(`data: ${JSON.stringify({ type: "DONE" })}\n\n`);
        }
        if (!res.writableEnded) {
            res.end();
        }
    } catch (err: any) {
        if (!res.headersSent) {
            return res.status(500).json({ success: false, error: err.message || "Failed to stream Plum chat" });
        }
        if (!clientClosed && !res.writableEnded) {
            res.write(`data: ${JSON.stringify({ type: "ERROR", error: err.message || "Stream failed" })}\n\n`);
            res.end();
        }
    }
}

/**
 * Backwards compatibility & account-isolated operations
 */
async function create(chatData: any) {
    try {
        const now = formatDateTime();
        const id = new mongoose.Types.ObjectId();
        const doc = new Chats({
            _id: id,
            session_id: chatData.session_id || id.toString(),
            ...chatData,
            application: "plum",
            created_at: chatData.created_at || now,
            updated_at: chatData.updated_at || now,
        });
        return await doc.save();
    } catch (err) {
        handleErrorUtil(filePath, "create", err, "Creating a new Chat in the DB");
        throw err;
    }
}

async function getById(id: string, email?: string) {
    try {
        const queryFilter: any = {};
        if (mongoose.Types.ObjectId.isValid(id)) {
            queryFilter.$or = [{ _id: new mongoose.Types.ObjectId(id) }, { session_id: id }];
        } else {
            queryFilter.$or = [{ session_id: id }, { _id: id }];
        }
        const chat: any = await Chats.findOne(queryFilter).lean();
        if (!chat) return null;

        if (email && chat.email) {
            const authorized = await getAuthorizedEmailsForUser(email);
            const chatEmail = String(chat.email).toLowerCase().trim();
            const chatMailbox = String(chat.mailboxEmail || "").toLowerCase().trim();
            if (!authorized.includes(chatEmail) && (!chatMailbox || !authorized.includes(chatMailbox))) {
                return null;
            }
        }
        return chat;
    } catch (err) {
        handleErrorUtil(filePath, "getById", err, `Fetching Chat id=${id}`);
        throw err;
    }
}

async function getList(email?: string, limit: number = 30, cursor: string | null = null) {
    try {
        const authorized = email ? await getAuthorizedEmailsForUser(email) : undefined;
        const query = buildAuthChatFilter(authorized);
        if (email && query.$or) {
            // Strict filtering when email explicitly requested
            const regexes = authorized!.map((e) => new RegExp(`^${escapeRegex(e)}$`, "i"));
            query.$or = [{ email: { $in: regexes } }, { mailboxEmail: { $in: regexes } }];
        }
        const chats = await Chats.find(query)
            .sort({ updated_at: -1, created_at: -1 })
            .limit(limit);

        return {
            chats,
            nextCursor: null,
            hasMore: false,
        };
    } catch (err) {
        handleErrorUtil(filePath, "getList", err, "Fetching chat list");
        throw err;
    }
}

async function getByTitleDate(title: string, createdAt: string, email?: string) {
    try {
        const filter: any = {
            title,
            application: "plum",
        };
        if (email) {
            const authorized = await getAuthorizedEmailsForUser(email);
            filter.email = { $in: authorized.map((e) => new RegExp(`^${escapeRegex(e)}$`, "i")) };
        }
        return await Chats.findOne(filter).lean();
    } catch (err) {
        handleErrorUtil(filePath, "getByTitleDate", err, "Fetching Chat by title");
        throw err;
    }
}

async function update(chatData: any, email?: string) {
    try {
        const id = chatData._id || chatData.session_id;
        if (!id) throw new Error("Chat ID is required for update");

        const existing = await getById(String(id), email);
        if (!existing) return null;

        const updatePayload = { ...chatData, updated_at: formatDateTime() };
        delete updatePayload.email;

        const result = await Chats.findOneAndUpdate(
            { _id: existing._id },
            { $set: updatePayload },
            { new: true }
        );
        return result;
    } catch (err) {
        handleErrorUtil(filePath, "update", err, "Updating the chat in the DB");
        throw err;
    }
}

async function del(id: string, email?: string) {
    try {
        const existing = await getById(id, email);
        if (!existing) return null;
        return await Chats.findOneAndDelete({ _id: existing._id });
    } catch (err) {
        handleErrorUtil(filePath, "del", err, "Deleting the chat from the DB");
        throw err;
    }
}

const chatOps = {
    getApiChats,
    getApiChatById,
    deleteApiChat,
    streamChat,
    create,
    getById,
    getList,
    getByTitleDate,
    update,
    del,
};

export default chatOps;
