import { Router, Request, Response } from "express";
import userOps from "../controllers/user.controllers";

const userRouter = Router();

userRouter.get('/auth/callback', async (req: Request, res: Response) => {
    await userOps.googleCallback(req, res);
});

export default userRouter;