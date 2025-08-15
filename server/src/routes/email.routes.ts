import { Router, Request, Response } from "express";
import emailOps from "../controllers/email.controllers";

const emailRouter = Router();

emailRouter.post('/send', (req: Request, res: Response) => {
    emailOps.sendEmail(req, res);
});
emailRouter.post('/draft', (req: Request, res: Response) => {
    emailOps.draftEmail(req, res);
});
emailRouter.get('/fetch', (req: Request, res: Response) => {
    emailOps.fetchEmails(req, res);
});

export default emailRouter;