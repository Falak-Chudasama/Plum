import { WebSocketServer } from "ws";
import logger from "../utils/logger.utils";
import clientWss from "./client.socket";

const WEB_SOCKET_PORT2 = Number(process.env.WEB_SOCKET_PORT2) || 4085;

const fwdToClientSocket = new Set([
    "RESPONSE",
    "THOUGHT",
    "INFO",
    "SYSTEM", // subtype: QUERY, EMAIL, CHAT, TITLE, INTENT
    "ERROR",
]);

const orchWss = new WebSocketServer({ port: WEB_SOCKET_PORT2 });
orchWss.on('listening', () => {
    logger.info(`orchWss is listening at -> localhost:${WEB_SOCKET_PORT2}`);
});

orchWss.on("close", (socket) => {
    logger.info(`Socket Disconnected`);
})

orchWss.on('connection', (socket) => {
    if (orchWss.clients.size > 1) {
        orchWss.clients.forEach(c => c.close());
        logger.warn("Closed previous orch connection and accepted the new one.");
    }

    logger.info('Orchestration <-> Server Connection Established');

    socket.on("message", (data: string) => {
        data = data.toString();
        const response = JSON.parse(data);
        if (fwdToClientSocket.has(response.type)) {
            clientWss.clients.forEach((client) => {
                logger.info(`Sent '${response.type}' to Client`);
                client.send(data);
            });
        }
    });
});

export default orchWss;