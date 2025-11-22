import { WebSocketServer } from "ws";
import logger from "../utils/logger.utils";
import orchWss from "./orchestration.socket";
import globals from "../globals/globals";
import chatOps from "../controllers/chat.controllers";

const WEB_SOCKET_PORT1 = Number(process.env.WEB_SOCKET_PORT1) || 4065;

const fwdToOrchSocket = new Set([
    "PROMPT",
    "COMMAND"
]);

const clientWss = new WebSocketServer({ port: WEB_SOCKET_PORT1 });
clientWss.on('listening', () => {
    logger.info(`clientWss is listening at -> localhost:${WEB_SOCKET_PORT1}`);
});

clientWss.on('connection', (socket) => {
    if (clientWss.clients.size > 1) {
        clientWss.clients.forEach(c => c.close());
        logger.warn("Closed previous client connection and accepted the new one.");
    }

    logger.info('Client <-> Server Connection Established');

    socket.on("message", async (data: string) => {
        data = data.toString();
        let response = JSON.parse(data);
        if (fwdToOrchSocket.has(response.type)) {
            if (response.type === 'COMMAND' && response.command.split(':')[0] === 'NEW_CHAT_CLICKED') {
                const id = response.command.split(':')[1];
                const chat = await chatOps.getById(id);
                response = {
                    ...response,
                    command: 'NEW_CONTEXT',
                    chat
                };
            }

            orchWss.clients.forEach((client) => {
                logger.info(`Sent '${response.type}' to Orch`);
                const newResponse = {
                    ...response,
                    user: {
                        email: globals.email,
                        firstName: globals.userFn,
                        lastName: globals.userLn,
                    }
                }
                client.send(JSON.stringify(newResponse));
            });
        }
    });
});

export default clientWss;