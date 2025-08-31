import { Router } from "express";
import userOps from "../controllers/user.controllers";

const userRouter = Router();

// api.plum.com/user
userRouter.get('/', userOps.findUser);
userRouter.post('/auth/login', userOps.loginUser);
userRouter.get('/auth/callback', userOps.googleCallback);

export default userRouter;