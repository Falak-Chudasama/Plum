import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";
import logger from "../utils/logger.utils";

import emailRouter from "../routes/email.routes";
import userRouter from "../routes/user.routes";

dotenv.config({ quiet: true });

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: process.env.ACCEPTED_ORIGINS!.split(','),
    methods: ["GET", "POST"],
    credentials: true
}));
app.use(morgan('combined', {
    stream: {
        write: (message) => logger.http(message.trim())
    }
}));

// Routes
app.use('/email', emailRouter);
app.use('/user', userRouter);

// Requests
app.get('', (req: Request, res: Response) => {
    res.send('Plum is listening')
});

export default app;