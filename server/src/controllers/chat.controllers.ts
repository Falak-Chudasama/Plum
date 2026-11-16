import { Request, Response } from "express";
import mongoose from "mongoose";
import Chats from "../models/chat";
import { handleErrorUtil } from "../utils/errors.utils";
import { formatDateTime } from "../utils/utils";
import logger from "../utils/logger.utils";

const filePath = "./src/controllers/chat.controllers.ts";

/**
 * Standard Multi-Chat Endpoint: GET /api/chats
 * Returns: [{ _id, session_id, title, updated_at }]
 */
async function getApiChats(req: Request, res: Response) {
    try {
        const chats = await Chats.find({ application: "plum" })
            .select("_id session_id title updated_at created_at")
            .sort({ updated_at: -1, created_at: -1 })
            .lean();

        const formatted = chats.map((c: any) => ({
            _id: c._id.toString(),
            session_id: c.session_id || c._id.toString(),
            title: c.title || "New Chat",
            updated_at: c.updated_at || c.created_at || formatDateTime(),
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
        const queryFilter: any = {};
        if (mongoose.Types.ObjectId.isValid(id)) {
            queryFilter.$or = [{ _id: new mongoose.Types.ObjectId(id) }, { session_id: id }];
        } else {
            queryFilter.$or = [{ session_id: id }, { _id: id }];
        }

        const chat = await Chats.findOne(queryFilter).lean();
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
        const queryFilter: any = {};
        if (mongoose.Types.ObjectId.isValid(id)) {
            queryFilter.$or = [{ _id: new mongoose.Types.ObjectId(id) }, { session_id: id }];
        } else {
            queryFilter.$or = [{ session_id: id }, { _id: id }];
        }

        const deleted = await Chats.findOneAndDelete(queryFilter);
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
 * Backwards compatibility endpoints
 */
async function create(chatData: any) {
    try {
        const now = formatDateTime();
        const doc = new Chats({
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
        return await Chats.findOne(queryFilter).lean();
    } catch (err) {
        handleErrorUtil(filePath, "getById", err, `Fetching Chat id=${id}`);
        throw err;
    }
}

async function getList(email?: string, limit: number = 30, cursor: string | null = null) {
    try {
        const query: any = { application: "plum" };
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
        const result = await Chats.findOne({
            title,
            application: "plum",
        }).lean();
        return result;
    } catch (err) {
        handleErrorUtil(filePath, "getByTitleDate", err, "Fetching Chat by title");
        throw err;
    }
}

async function update(chatData: any, email?: string) {
    try {
        const id = chatData._id || chatData.session_id;
        if (!id) throw new Error("Chat ID is required for update");

        chatData.updated_at = formatDateTime();
        const result = await Chats.findOneAndUpdate(
            { $or: [{ _id: id }, { session_id: id }] },
            { $set: chatData },
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
        const queryFilter: any = {};
        if (mongoose.Types.ObjectId.isValid(id)) {
            queryFilter.$or = [{ _id: new mongoose.Types.ObjectId(id) }, { session_id: id }];
        } else {
            queryFilter.$or = [{ session_id: id }, { _id: id }];
        }
        return await Chats.findOneAndDelete(queryFilter);
    } catch (err) {
        handleErrorUtil(filePath, "del", err, "Deleting the chat from the DB");
        throw err;
    }
}

const chatOps = {
    getApiChats,
    getApiChatById,
    deleteApiChat,
    create,
    getById,
    getList,
    getByTitleDate,
    update,
    del,
};

export default chatOps;
