import WebSocket from "ws";
import logger from "../utils/logger.utils";
import chat from "../agents/chat.agents";

const SERVER_WS_URL = process.env.SERVER_WS_URL || "ws://localhost:4085";

let serverSocket: WebSocket | null = null;
let reconnectAttempts = 0;
const retryDelay = 5000;
const MAX_RETRIES = 1000;

function connectToServer() {
    if (serverSocket && (serverSocket.readyState === WebSocket.OPEN || serverSocket.readyState === WebSocket.CONNECTING)) {
        logger.info("connectToServer: socket already open or connecting - skipping new connect");
        return;
    }
    logger.info(`Connecting to Server WebSocket at ${SERVER_WS_URL}...`);

    serverSocket = new WebSocket(SERVER_WS_URL);

    serverSocket.on("open", () => {
        reconnectAttempts = 0;
        logger.info(`Connected to Server WebSocket at ${SERVER_WS_URL}`);
    });

    serverSocket.on("message", async (data: string) => {
        try {
            logger.info(data);
            data = data.toString();
            const req = JSON.parse(data);
            logger.info("Message from server:", req);
            if (req.type === 'PROMPT') {
                await chat(serverSocket, req.prompt, req.user, req.model, req.chatCount);
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
        if (serverSocket && serverSocket.readyState !== WebSocket.CLOSED) {
            serverSocket.close();
        }
    });
}

function attemptReconnect() {
    if (reconnectAttempts >= MAX_RETRIES) {
        logger.error("Max reconnect attempts reached. Giving up.");
        return;
    }

    logger.info(`Attempting reconnect (${MAX_RETRIES - reconnectAttempts - 1} attempts left) in ${retryDelay / 1000}s...`);
    reconnectAttempts++;

    setTimeout(() => {
        logger.info("Reconnecting...");
        connectToServer();
    }, retryDelay);
}

connectToServer();

export default serverSocket;