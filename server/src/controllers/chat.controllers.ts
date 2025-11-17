import Chats from "../models/chat";
import { ChatType } from "../types/types";
import { handleErrorUtil } from "../utils/errors.utils";

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

async function getById(id: string) {
    try {
        const result = await Chats.findById(id);
        if (!result) throw new Error(`Chat with ID ${id} not found`);
        return result;
    } catch (err) {
        handleErrorUtil(filePath, "getById", err, "Fetching Chat by Id");
        throw err;
    }
}

async function getList(email: string, limit: number, cursor: string | null) {
    try {
        if (email.trim() === '') {
            return {
                chats: [],
                nextCursor: cursor,
                hasMore: false
            }
        }

        const query: any = { email };
        if (cursor) {
            query.createdAt = { $lt: new Date(cursor) }
        }

        const chats = await Chats.find(query).select("_id email title archived isViewed createdAt").sort({ createdAt: -1 }).limit(limit + 1);

        const hasMore = chats.length > limit;

        if (hasMore) {
            chats.pop();
        }

        const nextCursor = chats.length > 0 ? chats[chats.length - 1].createdAt.toISOString() : null;

        const response = {
            chats,
            nextCursor,
            hasMore
        };
        return response
    } catch (err) {
        handleErrorUtil(filePath, "getList", err, "fetching chat list");
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
            createdAt: { $gte: start, $lte: end }
        });
        if (!result) throw new Error(`Chat not found for ${title} on ${createdAt}`);
        return result;
    } catch (err) {
        handleErrorUtil(filePath, "getByTitleDate", err, "Fetching Chat by title and date");
        throw err;
    }
}

async function update(chat: ChatType) {
    try {
        if (!chat._id) throw new Error("Chat ID is required for update");
        const result = await Chats.findByIdAndUpdate(chat._id, chat, {
            new: true,
            runValidators: true
        });
        if (!result) throw new Error(`Chat with ID ${chat._id} not found for update`);
        return result;
    } catch (err) {
        handleErrorUtil(filePath, "update", err, "Updating the chat in the DB");
        throw err;
    }
}

async function del(id: string) {
    try {
        const result = await Chats.findByIdAndDelete(id);
        if (!result) throw new Error(`Chat with ID ${id} not found for deletion`);
        return result;
    } catch (err) {
        handleErrorUtil(filePath, "del", err, "Deleting the chat from the DB");
        throw err;
    }
}

const chatOps = {
    create,
    getById,
    getList,
    getByTitleDate,
    update,
    del
};

export default chatOps;