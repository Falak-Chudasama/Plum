import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import logger, { morganMiddleware } from "../utils/logger.utils";

import emailRouter from "../routes/email.routes";
import userRouter from "../routes/user.routes";

import authenticateUser from "../middlewares/auth.middlewares";
import authenticateUserGoogle from "../middlewares/googleAuth.middlewares";

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: process.env.ACCEPTED_ORIGINS!.split(','),
    methods: ["GET", "POST"],
    credentials: true
}));
app.use(cookieParser());
app.use(morganMiddleware);

// Routes
app.use('/email', authenticateUser, authenticateUserGoogle, emailRouter);
app.use('/user', userRouter);

// Requests
app.get('', (req: Request, res: Response) => {
    res.send('Plum is listening')
});

export default app;