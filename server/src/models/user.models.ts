import mongoose from "mongoose";

export const userSchema = new mongoose.Schema({ 
    email: {
        type: String,
        required: true,
        unique: true
    },
    name: { type: String },
    lastName: { type: String },
    profilePicture: { type: String },
    google: {
        accessToken: {
            type: String
        },
        refreshToken: {
            type: String
        },
        IdToken: {
            type: String
        }
    }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

export default User;