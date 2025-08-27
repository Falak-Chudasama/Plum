import cors from "cors";
import cookieParser from "cookie-parser";
import express, { Request, Response } from "express";
import handleError from "../utils/errors.utils";
import categorize from "../agents/categorizer.agents";
import { morganMiddleware } from "../utils/logger.utils";
import summarize from "../agents/summarizer.agents";

const filePath = '/app/app.ts';

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cors({
    origin: process.env.ACCEPTED_ORIGINS!.split(','),
    methods: ["GET", "POST"],
    credentials: true
}));
app.use(cookieParser());
app.use(morganMiddleware);

app.get('/', (req: Request, res: Response) => {
    res.send('Plum orchestration is listening');
});

app.post('/categorize', async (req: Request, res: Response) => {
    try {
        const { emails, categories } = req.body;

        if (!emails || emails.length === 0) {
            throw Error('Emails are missing in the request');
        }
        if (!categories || categories.length === 0) {
            throw Error('Categories are missing in the request');
        }

        for (let email of emails) {
            const emailCategories = await categorize(email, categories) || ['Other'];
            email.categories = emailCategories;
        }

        res.status(200).json({ emails, success: true });
    } catch (err) {
        handleError(filePath, '<categorize callback>', res, err, 'Serving Categorization');
        res.status(500).json({ message: 'Internal Server Error in OL', success: false });
    }
});

app.post('/summarize', async (req: Request, res: Response) => {
    try {
        const { emails } = req.body;

        if (!emails || emails.length === 0) {
            throw Error('Emails are missing in the request');
        }

        const summary = await summarize(emails) || '<NO SUMMARY>';

        res.status(200).json({ summary, success: true });
    } catch (err) {
        handleError(filePath, '<summarize callback>', res, err, 'Serving Summarization');
        res.status(500).json({ message: 'Internal Server Error in OL', success: false });
    }
});

export default app;