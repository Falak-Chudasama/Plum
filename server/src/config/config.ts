import mongoose from "mongoose";
import logger from "../utils/logger.utils";
import { handleErrorUtil } from "../utils/errors.utils";

const MONGO_URI: string | undefined = process.env.MONGO_URI;

if (!MONGO_URI) throw new Error('No Plum DB URI found')

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(MONGO_URI!);
        logger.info('Plum DB connected');
    } catch (error) {
        handleErrorUtil('/src/config/config.ts', 'connectDB', error, "Connecting to DB");
    }
};

export default connectDB;