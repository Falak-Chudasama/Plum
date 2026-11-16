import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { morganMiddleware } from "../utils/logger.utils";

import emailRouter from "../routes/email.routes";
import userRouter from "../routes/user.routes";
import categoryRouter from "../routes/category.routes";
import chatRouter from "../routes/chat.routes"; 

import authenticateUser, { optionalAuthenticateUser } from "../middlewares/auth.middlewares";

const app = express();

// Middlewares
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors({
    origin: (process.env.ACCEPTED_ORIGINS || "https://plum.jam,http://127.0.0.2:10000,http://localhost:10000,https://api.plum.jam").split(','),
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
}));
app.use(cookieParser());
app.use(morganMiddleware);

// Standard Multi-Chat & AI Endpoints
app.use('/api/chats', optionalAuthenticateUser, chatRouter);
app.use('/api', optionalAuthenticateUser, chatRouter);

// Domain Routes
app.use('/email', authenticateUser, emailRouter);
app.use('/user', userRouter);
app.use('/category', authenticateUser, categoryRouter);
app.use('/chat', optionalAuthenticateUser, chatRouter);

// Health check / root
app.get('', (req: Request, res: Response) => {
    res.send('Plum is listening');
});

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: "healthy", service: "plum-server" });
});

export default app;
