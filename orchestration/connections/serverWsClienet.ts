import WebSocket from "ws";
import logger from "../utils/logger.utils";
import chat from "../agents/chat.agents";

const SERVER_WS_URL = process.env.SERVER_WS_URL || "ws://localhost:4085";

let serverSocket: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RETRIES = 1000;

function connectToServer() {
    logger.info(`Connecting to Server WebSocket at ${SERVER_WS_URL}...`);

    serverSocket = new WebSocket(SERVER_WS_URL);

    serverSocket.on("open", () => {
        reconnectAttempts = 0;
        logger.info(`Connected to Server WebSocket at ${SERVER_WS_URL}`);
    });

    serverSocket.on("message", async (data: string) => {
        try {
            data = data.toString();
            const req = JSON.parse(data);
            logger.info("Message from server:", req);
            if (req.type === 'PROMPT') {
                await chat(serverSocket, req.prompt);
            }
        } catch (err) {
            logger.error("Error handling message:", err);
        }
    });

    serverSocket.on("close", (code, reason) => {
        logger.warn(`Connection closed (${code}) — ${reason.toString()}`);
        attemptReconnect();
    });

    serverSocket.on("error", (err) => {
        logger.error("WebSocket error:", err);
        serverSocket?.close();
    });
}

function attemptReconnect() {
    if (reconnectAttempts >= MAX_RETRIES) {
        logger.error("Max reconnect attempts reached. Giving up.");
        return;
    }

    const retryDelay = Math.min(5000 * Math.pow(2, reconnectAttempts), 60000);
    logger.info(`⏳ Attempting reconnect in ${retryDelay / 1000}s...`);
    reconnectAttempts;

    setTimeout(() => {
        logger.info("Reconnecting...");
        connectToServer();
    }, retryDelay);
}

connectToServer();

export default serverSocket;