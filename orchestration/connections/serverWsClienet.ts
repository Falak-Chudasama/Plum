import WebSocket from "ws";
import logger from "../utils/logger.utils";

const SERVER_WS_URL = process.env.SERVER_WS_URL || "ws://localhost:4085";

const serverSocket = new WebSocket(SERVER_WS_URL);

serverSocket.on("open", () => {
    logger.info(`Connected to Server WebSocket at ${SERVER_WS_URL}`);
    serverSocket.send("Hello from Orchestration!");
});

serverSocket.on("message", (data) => {
    logger.info(`📩 Message from Server: ${data.toString()}`);
});