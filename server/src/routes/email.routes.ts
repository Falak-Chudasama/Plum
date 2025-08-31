import { Router } from "express";
import emailOps from "../controllers/email.controllers";

const emailRouter = Router();

// api.plum.com/email
emailRouter.post('/send', emailOps.sendEmail);
emailRouter.post('/draft', emailOps.draftEmail);
emailRouter.get('/fetch', emailOps.fetchEmails);

export default emailRouter;