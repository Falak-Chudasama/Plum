import { WebSocketServer } from "ws";
import logger from "../utils/logger.utils";
import orchWss from "./orchestration.socket";

const WEB_SOCKET_PORT1 = Number(process.env.WEB_SOCKET_PORT1) || 4065;

const clientWss = new WebSocketServer({ port: WEB_SOCKET_PORT1 });
clientWss.on('listening', () => {
    logger.info(`clientWss is listening at -> localhost:${WEB_SOCKET_PORT1}`);
});

clientWss.on('connection', (socket) => {
    logger.info('Client <-> Server Connection Established');

    socket.on("message", (data: string) => {
        data = data.toString();
        console.log("Received:", data);
        const response = JSON.parse(data);
        if (response.type === 'PROMPT') {
            orchWss.clients.forEach((client) => {
                client.send(data);
            });
        }
    });
});

export default clientWss;