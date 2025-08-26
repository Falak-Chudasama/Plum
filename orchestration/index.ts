import dotenv from "dotenv";
dotenv.config({ quiet: true });

import app from "./app/app";

const PORT = Number(process.env.PORT!);
const HOST = process.env.HOST!;
const ORIGIN = process.env.ORIGIN!;


(() => {
    app.listen(PORT, HOST, async () => {
        console.log('ORCHESTRATION listening to: http://' + ORIGIN);
    });
})();