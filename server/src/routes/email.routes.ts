import { Router } from "express";
import emailOps from "../controllers/email.controllers";
import authenticateUser from "../middlewares/auth.middlewares";
import authenticateUserGoogle from "../middlewares/googleAuth.middlewares";

const emailRouter = Router();

// api.plum.com/email
// Routes requiring live Google OAuth credentials
emailRouter.post('/send', authenticateUserGoogle, emailOps.sendEmail);
emailRouter.post('/fetch', authenticateUserGoogle, emailOps.fetchEmails);

// Local DB operations (authenticated with Plum JWT session)
emailRouter.get('/drafts', authenticateUser, emailOps.fetchDrafts);
emailRouter.post('/draft', authenticateUser, emailOps.draftEmail);
emailRouter.post('/fetch-by-date', authenticateUser, emailOps.fetchEmailsDate);
emailRouter.patch('/set-is-viewed', authenticateUser, emailOps.updateIsViewed);
emailRouter.post('/fetch-outbound-by-date', authenticateUser, emailOps.fetchOutboundEmailsDate);
emailRouter.patch('/set-outbound-is-viewed', authenticateUser, emailOps.updateOutboundIsViewed);

export default emailRouter;
