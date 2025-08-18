import dotenv from "dotenv";
import app from "./app/app";
import connectDB from "./config/config";

// TODO: Fix loggers
// TODO: Add https protocol

dotenv.config({ quiet: true });

const host: string = process.env.HOST || 'localhost';
const port: number = Number(process.env.PORT) || 3000;
const origin: string = process.env.BACKEND_ORIGIN!;

(() => {
    app.listen(port!, host!, async () => {
        await connectDB();
        console.log(`SERVER listening to -> ${origin} \n`);
    });
})();