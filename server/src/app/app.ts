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

app.get('/user/auth/google/callback', async (req: Request, res: Response) => {
    const { code } = req.query;

    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: 'http://api.plum.com/user/auth/google/callback',
        grant_type: 'authorization_code',
    });

    const { access_token, refresh_token, id_token } = tokenResponse.data;

    const userInfo = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
    });

    // res.redirect(`http://plum.com/dashboard?email=${userEmail}`);
});

export default app;