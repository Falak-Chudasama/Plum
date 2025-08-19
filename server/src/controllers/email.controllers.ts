import { Request, Response } from "express";
import axios from "axios";
import base64url from "base64url";
import { google } from "googleapis";
import MailComposer from "nodemailer/lib/mail-composer";

import handleError from "../utils/errors.utils";
import { EmailType, GoogleAuthenticatedRequest } from "../types/types";

const filePath: string = '/src/controllers/email.controllers.ts'

// TODO: Use dynamic fields from `email` if needed


// GET api.plum.com/email/fetch
const fetchEmails = async (req: Request, res: Response) => { }

// POST api.plum.com/email/draft
const draftEmail = async (req: Request, res: Response) => { }

// POST api.plum.com/email/send
const sendEmail = async (req: Request, res: Response) => {
    const googleReq = req as GoogleAuthenticatedRequest;
    const userEmail = googleReq.user.email;
    const OAuth = googleReq.auth;
    
    const email: EmailType = req.body?.email;
    if (!email || !email.to || !email.body || !email.contentType) {
        return handleError(filePath, 'sendEmail', res, 'Incomplete email payload', 'InvalidRequest', 400);
    }
    
    const gmail = await google.gmail({ version: 'v1', auth: OAuth });
    
    try {
        const mail = new MailComposer({
            to: email.to,
            cc: email?.cc,
            bcc: email?.bcc,
            subject: email?.subject || 'NO SUBJECT',
            text: email.contentType !== 'text/html' ? email.body : undefined,
            html: email.contentType === 'text/html' ? email.body : undefined,
            attachments: email?.files?.map((file: { name: string; content: string | Buffer; type: string }) => ({
                filename: file.name,
                content: file.content,
                contentType: file.type,
            })),
        });
        
        const componsedMail = await mail.compile().build();
        
        const encodedMessage = Buffer.from(componsedMail)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
            
            const result = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedMessage,
                },
            });

            res.status(200).json({ message: result, success: true });
        } catch (err) {
        handleError(filePath, 'sendEmail', res, err, 'Sending Email');
    }
};

const emailOps = {
    sendEmail,
    fetchEmails,
    draftEmail
};

export default emailOps;
