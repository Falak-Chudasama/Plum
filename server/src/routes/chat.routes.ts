import { Router, Request, Response } from "express";
import chatOps from "../controllers/chat.controllers";
import handleError from "../utils/errors.utils";

const chatRouter = Router();

const filePath = "/src/routes/chat.routes.ts";

async function create(req: Request, res: Response) {
    try {
        const chat = req.body;
        const result = await chatOps.create(chat);
        if (!result) return res.status(500).json({ success: false });
        return res.status(200).json({ success: true, result });
    } catch (err) {
        handleError(filePath, "create", res, err, "creating chat");
    }
}

async function getById(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const result = await chatOps.getById(id);
        if (!result) return res.status(404).json({ success: false, message: "Chat not found" });
        return res.status(200).json({ success: true, result });
    } catch (err) {
        handleError(filePath, "getById", res, err, "fetching chat by id");
    }
}

async function getChatList(req: Request, res: Response) {
    try {
        const { email, limit = 20, cursor } = req.query;

        const chats = await chatOps.getList(email as string, Number(limit), cursor as string | null);
        return res.status(200).json({ success: true, result: chats });
    } catch (err) {
        handleError(filePath, "getChatList", res, err, "fetching chat list");
    }
}

async function getByTitleDate(req: Request, res: Response) {
    try {
        const { title, createdAt, email } = req.query;
        if (!title || !createdAt || !email)
            return res.status(400).json({ success: false, message: "Missing query params" });

        const result = await chatOps.getByTitleDate(
            String(title),
            String(createdAt),
            String(email)
        );

        if (!result) return res.status(404).json({ success: false, message: "Chat not found" });
        return res.status(200).json({ success: true, result });

    } catch (err) {
        handleError(filePath, "getByTitleDate", res, err, "fetching chat by title/date");
    }
}

async function update(req: Request, res: Response) {
    try {
        const chat = req.body;
        const result = await chatOps.update(chat);
        if (!result) return res.status(404).json({ success: false, message: "Chat not found" });
        return res.status(200).json({ success: true, result });
    } catch (err) {
        handleError(filePath, "update", res, err, "updating chat");
    }
}

async function del(req: Request, res: Response) {
    try {
        const { id } = req.query;
        if (!id) return res.status(400).json({ success: false, message: "Missing chat ID" });

        const result = await chatOps.del(String(id));
        if (!result) return res.status(404).json({ success: false, message: "Chat not found" });

        return res.status(200).json({ success: true, result });

    } catch (err) {
        handleError(filePath, "del", res, err, "deleting chat");
    }
}

// api.plum.com/chat
chatRouter.post("/create", create);
chatRouter.get("/get/:id", getById);
chatRouter.get("/getByTitleDate", getByTitleDate);
chatRouter.get("/getList", getChatList);
chatRouter.put("/update", update);
chatRouter.delete("/delete", del);

export default chatRouter;