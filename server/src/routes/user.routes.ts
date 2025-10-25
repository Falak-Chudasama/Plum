import { Router } from "express";
import userOps from "../controllers/user.controllers";
import categoryOps from "../controllers/category.controllers";

const userRouter = Router();

// api.plum.com/user
userRouter.post('/', userOps.findUser);
userRouter.post('/auth/login', userOps.loginUser);
userRouter.get('/auth/callback', userOps.googleCallback);

userRouter.get('/categories/:email', categoryOps.findByEmail);

export default userRouter;