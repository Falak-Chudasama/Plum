import { Request, Response } from "express";
import axios from "axios";
import handleError from "../utils/errors.utils";
import User from "../models/user.models";

// TODO: add user operations, creation and auth

const createUserUtil = async () => {
    const user = await User.create({
        email: "falakchudasama7766@gmail.com",
        name: "Falak Chudasama",
        profilePicture: "profile_picture_url",
        google: {
            accessToken: "access_token",
            refreshToken: "refresh_token",
            IdToken: "id_token",
        }
    });

    console.log(user);
};

const userOps = {
    createUserUtil
};

export default userOps;
