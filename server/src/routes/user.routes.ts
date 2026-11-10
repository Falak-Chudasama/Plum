import { Router } from "express";
import userOps from "../controllers/user.controllers";
import mailboxControllers from "../controllers/mailbox.controllers";
import categoryOps from "../controllers/category.controllers";
import authenticateUser, { optionalAuthenticateUser } from "../middlewares/auth.middlewares";

const userRouter = Router();

// api.plum.com/user
userRouter.get('/me', authenticateUser, userOps.getMe);
userRouter.post('/logout', authenticateUser, userOps.logoutUser);
userRouter.post('/', authenticateUser, userOps.findUser);
userRouter.post('/auth/login', userOps.loginUser);
userRouter.get('/auth/callback', userOps.googleCallback);

// Mailbox Management Routes
userRouter.get('/mailboxes', authenticateUser, mailboxControllers.getMailboxes);
userRouter.get('/mailboxes/connect-url', optionalAuthenticateUser, mailboxControllers.getConnectUrl);
userRouter.get('/mailboxes/:id/status', authenticateUser, mailboxControllers.getMailboxStatus);
userRouter.post('/mailboxes/:id/refresh', authenticateUser, mailboxControllers.refreshMailboxToken);
userRouter.post('/mailboxes/:id/primary', authenticateUser, mailboxControllers.setPrimaryMailbox);
userRouter.delete('/mailboxes/:id', authenticateUser, mailboxControllers.disconnectMailbox);

userRouter.get('/categories/:email', authenticateUser, categoryOps.findByEmail);

export default userRouter;
