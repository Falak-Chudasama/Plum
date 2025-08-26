import cors from "cors";
import cookieParser from "cookie-parser";
import express, { Request, Response } from "express";
import handleError from "../utils/errors.utils";
import categorize from "../agents/categorizer.agents";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: process.env.ACCEPTED_ORIGINS!.split(','),
    methods: ["GET", "POST"],
    credentials: true
}));
app.use(cookieParser());

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
        handleError(err);
        res.status(500).json({ message: 'Internal Server Error in OL', success: false });
    }
});

export default app;