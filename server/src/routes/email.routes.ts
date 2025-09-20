import { Router } from "express";
import emailOps from "../controllers/email.controllers";

const emailRouter = Router();

// api.plum.com/email
emailRouter.post('/send', emailOps.sendEmail);
emailRouter.post('/draft', emailOps.draftEmail);
emailRouter.post('/fetch', emailOps.fetchEmails);
emailRouter.post('/fetch-by-date', emailOps.fetchEmailsDate);

export default emailRouter;