import { Request, Response } from "express";
import axios from "axios";
import base64url from "base64url";
import handleError from "../utils/errors.utils";
import { EmailType } from "../types/types";

// TODO: Use dynamic fields from `email` if needed

async function fetchEmails(req: Request, res: Response) {}

async function draftEmail(req: Request, res: Response) {}

async function sendEmail(req: Request, res: Response) {
    const accessToken = req.headers.authorization?.split(' ')[1];
    if (!accessToken) {
        return handleError(
            "server/src/controllers/email.controllers.ts",
            "sendEmail",
            res,
            "Missing access token in Authorization header",
            "AuthorizationError",
            401
        );
    }

    const email: EmailType = req.body.email;

    const rawEmail = [
        `To: ${email.to}`,
        `Subject: ${email.subject}`,
        `Content-Type: ${email.contentType}; charset="UTF-8"`,
        "",
        email.body
    ].join("\n");

    const encodedMessage = base64url(Buffer.from(rawEmail));

    try {
        const response = await axios.post(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
            { raw: encodedMessage },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            }
        );

        res.status(200).json({
            success: true,
            message: "Email sent successfully",
            data: response.data,
        });
    } catch (error) {
        handleError(
            "server/src/controllers/email.controllers.ts",
            "sendEmail",
            res,
            error,
            "SendingEmailFailure"
        );
    }
}

const emailOps = {
    sendEmail,
    fetchEmails,
    draftEmail
};

export default emailOps;
