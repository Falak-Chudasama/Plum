import { Router, Request, Response } from "express";
import chatOps from "../controllers/chat.controllers";
import handleError from "../utils/errors.utils";
import { AuthenticatedRequest } from "../types/types";
import { optionalAuthenticateUser } from "../middlewares/auth.middlewares";

const chatRouter = Router();
const filePath = "/src/routes/chat.routes.ts";

async function create(req: Request, res: Response) {
    try {
        const userEmail = (req as AuthenticatedRequest).user?.email;
        const chat = req.body;
        if (userEmail) chat.email = userEmail;

        const result = await chatOps.create(chat);
        if (!result) return res.status(500).json({ success: false });
        return res.status(200).json({ success: true, result });
    } catch (err) {
        handleError(filePath, "create", res, err, "creating chat");
    }
}

async function getById(req: Request, res: Response) {
    try {
        const userEmail = (req as AuthenticatedRequest).user?.email;
        const { id } = req.params;

        const result = await chatOps.getById(id, userEmail);
        if (!result) {
            return res.status(404).json({ success: false, message: "Chat not found or access denied" });
        }
        return res.status(200).json({ success: true, result });
    } catch (err) {
        handleError(filePath, "getById", res, err, "fetching chat by id");
    }
}

async function getChatList(req: Request, res: Response) {
    try {
        const userEmail = (req as AuthenticatedRequest).user?.email;
        const { limit = 30, cursor } = req.query;

        const chats = await chatOps.getList(userEmail, Number(limit), cursor as string | null);
        return res.status(200).json({ success: true, result: chats, chats: chats.chats });
    } catch (err) {
        handleError(filePath, "getChatList", res, err, "fetching chat list");
    }
}

async function getByTitleDate(req: Request, res: Response) {
    try {
        const userEmail = (req as AuthenticatedRequest).user?.email;
        const { title, createdAt } = req.query;

        const result = await chatOps.getByTitleDate(
            String(title || ""),
            String(createdAt || ""),
            userEmail
        );

        if (!result) return res.status(404).json({ success: false, message: "Chat not found" });
        return res.status(200).json({ success: true, result });
    } catch (err) {
        handleError(filePath, "getByTitleDate", res, err, "fetching chat by title/date");
    }
}

async function update(req: Request, res: Response) {
    try {
        const userEmail = (req as AuthenticatedRequest).user?.email;
        const chat = req.body;
        if (userEmail) chat.email = userEmail;

        const result = await chatOps.update(chat, userEmail);
        if (!result) {
            return res.status(404).json({ success: false, message: "Chat not found or access denied" });
        }
        return res.status(200).json({ success: true, result });
    } catch (err) {
        handleError(filePath, "update", res, err, "updating chat");
    }
}

async function del(req: Request, res: Response) {
    try {
        const userEmail = (req as AuthenticatedRequest).user?.email;
        const { id } = req.query;

        if (!id) return res.status(400).json({ success: false, message: "Missing chat ID" });

        const result = await chatOps.del(String(id), userEmail);
        if (!result) {
            return res.status(404).json({ success: false, message: "Chat not found or access denied" });
        }

        return res.status(200).json({ success: true, result });
    } catch (err) {
        handleError(filePath, "del", res, err, "deleting chat");
    }
}

// Standard Multi-Chat Endpoints (Root matching /api/chats)
chatRouter.post("/stream", chatOps.streamChat);
chatRouter.post("/chats/stream", chatOps.streamChat);
chatRouter.get("/", chatOps.getApiChats);
chatRouter.get("/chats", chatOps.getApiChats);
chatRouter.get("/chats/:id", chatOps.getApiChatById);
chatRouter.delete("/chats/:id", chatOps.deleteApiChat);

// Backwards-compatible routes
chatRouter.get("/getList", getChatList);
chatRouter.get("/get/:id", getById);
chatRouter.get("/getByTitleDate", getByTitleDate);
chatRouter.post("/create", create);
chatRouter.put("/update", update);
chatRouter.delete("/delete", del);

// Direct single chat parameter
chatRouter.get("/:id", chatOps.getApiChatById);
chatRouter.delete("/:id", chatOps.deleteApiChat);

export default chatRouter;
