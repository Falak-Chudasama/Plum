import { Request, Response } from "express";
import Chats from "../models/chat";
import User from "../models/user.models";
import { ChatType, AuthenticatedRequest } from "../types/types";
import { handleErrorUtil } from "../utils/errors.utils";
import { handleChatPrompt, ChatMessageSender } from "../ai/services/chat.service";

const filePath = "./src/controllers/chat.controllers.ts";

async function create(chat: ChatType) {
    try {
        const result = await Chats.create(chat);
        return result;
    } catch (err) {
        handleErrorUtil(filePath, "create", err, "Creating a new Chat in the DB");
        throw err;
    }
}

async function getById(id: string, email: string) {
    try {
        const result = await Chats.findOne({ _id: id, email });
        return result;
    } catch (err) {
        handleErrorUtil(filePath, "getById", err, `Fetching Chat id=${id} for user=${email}`);
        throw err;
    }
}

async function getList(email: string, limit: number = 20, cursor: string | null = null) {
    try {
        if (!email || email.trim() === "") {
            return {
                chats: [],
                nextCursor: cursor,
                hasMore: false,
            };
        }

        const query: any = { email };
        if (cursor) {
            query.createdAt = { $lt: new Date(cursor) };
        }

        const chats = await Chats.find(query)
            .select("_id email title archived isViewed createdAt updatedAt messageCount")
            .sort({ createdAt: -1 })
            .limit(limit + 1);

        const hasMore = chats.length > limit;
        if (hasMore) {
            chats.pop();
        }

        const nextCursor = chats.length > 0 ? chats[chats.length - 1].createdAt.toISOString() : null;

        return {
            chats,
            nextCursor,
            hasMore,
        };
    } catch (err) {
        handleErrorUtil(filePath, "getList", err, "Fetching chat list");
        throw err;
    }
}

async function getByTitleDate(title: string, createdAt: string, email: string) {
    try {
        const date = new Date(createdAt);
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        const result = await Chats.findOne({
            title,
            email,
            createdAt: { $gte: start, $lte: end },
        });
        return result;
    } catch (err) {
        handleErrorUtil(filePath, "getByTitleDate", err, "Fetching Chat by title and date");
        throw err;
    }
}

async function update(chat: ChatType, email: string) {
    try {
        if (!chat._id) throw new Error("Chat ID is required for update");

        const result = await Chats.findOneAndUpdate(
            { _id: chat._id, email },
            {
                ...chat,
                email, // Prevent altering email ownership
            },
            {
                new: true,
                runValidators: true,
            }
        );
        return result;
    } catch (err) {
        handleErrorUtil(filePath, "update", err, "Updating the chat in the DB");
        throw err;
    }
}

async function del(id: string, email: string) {
    try {
        const result = await Chats.findOneAndDelete({ _id: id, email });
        return result;
    } catch (err) {
        handleErrorUtil(filePath, "del", err, "Deleting the chat from the DB");
        throw err;
    }
}

async function streamPrompt(req: Request, res: Response) {
    try {
        const userEmail = (req as AuthenticatedRequest).user?.email || req.body?.email;
        if (!userEmail) {
            return res.status(401).json({ success: false, error: "Unauthorized: Missing user authentication" });
        }

        const { prompt, chatCount = 0, chatId } = req.body;
        if (!prompt || !prompt.trim()) {
            return res.status(400).json({ success: false, error: "Prompt is required" });
        }

        let userName: string | undefined;
        let userLastName: string | undefined;
        try {
            const userRecord = await User.findOne({ email: userEmail }).lean();
            if (userRecord) {
                userName = userRecord.name || undefined;
                userLastName = userRecord.lastName || undefined;
            }
        } catch (_) {}

        // Enable SSE streaming
        res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        });
        if (typeof (res as any).flushHeaders === 'function') {
            (res as any).flushHeaders();
        }

        const sender: ChatMessageSender = {
            send: (payload: any) => {
                if (!res.writableEnded) {
                    res.write(`data: ${JSON.stringify(payload)}\n\n`);
                }
            },
            isOpen: () => !res.writableEnded,
        };

        await handleChatPrompt({
            prompt: prompt.trim(),
            chatCount: Number(chatCount) || 0,
            user: {
                email: userEmail,
                name: userName,
                lastName: userLastName,
            },
            chatId: chatId || null,
            socket: sender,
        });

        if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ type: "DONE" })}\n\n`);
            res.end();
        }
    } catch (err: any) {
        if (!res.headersSent) {
            return res.status(500).json({ success: false, error: err.message || "Failed to stream chat" });
        }
        if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ type: "ERROR", error: err.message })}\n\n`);
            res.end();
        }
    }
}

const chatOps = {
    create,
    getById,
    getList,
    getByTitleDate,
    update,
    del,
    streamPrompt,
};

export default chatOps;
