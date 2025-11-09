import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { morganMiddleware } from "../utils/logger.utils";

import emailRouter from "../routes/email.routes";
import userRouter from "../routes/user.routes";
import categoryRouter from "../routes/category.routes";

import authenticateUser from "../middlewares/auth.middlewares";
import authenticateUserGoogle from "../middlewares/googleAuth.middlewares";
import chatRouter from "../routes/chat.routes";

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: process.env.ACCEPTED_ORIGINS!.split(','),
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
}));
app.use(cookieParser());
app.use(morganMiddleware);

// Routes
app.use('/email', authenticateUser, authenticateUserGoogle, emailRouter);
app.use('/user', userRouter);
app.use('/category', authenticateUser, authenticateUserGoogle, categoryRouter);
app.use('/chat', authenticateUser, authenticateUserGoogle, chatRouter);

// Requests
app.get('', (req: Request, res: Response) => {
    res.send('Plum is listening')
});

export default app;