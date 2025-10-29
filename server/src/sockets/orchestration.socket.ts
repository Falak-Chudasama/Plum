import { WebSocketServer } from "ws";
import logger from "../utils/logger.utils";
import clientWss from "./client.socket";

const WEB_SOCKET_PORT2 = Number(process.env.WEB_SOCKET_PORT2) || 4085;

const orchWss = new WebSocketServer({ port: WEB_SOCKET_PORT2 });
orchWss.on('listening', () => {
    logger.info(`orchWss is listening at -> localhost:${WEB_SOCKET_PORT2}`);
});

orchWss.on('connection', (socket) => {
    logger.info('Orchestration <-> Server Connection Established');

    socket.on("message", (data: string) => {
        data = data.toString();
        const response = JSON.parse(data);
        // if (response.type === 'RESPONSE') {}
        clientWss.clients.forEach((client) => {
            client.send(data);
        })
        // if (response.done) {
        //     console.log();
        // } else {
        //     process.stdout.write(response?.response);
        // }
    });
});

export default orchWss;