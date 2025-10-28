import { useEffect } from "react";
import constants from "../constants/constants";

const WS_URL = constants.serverWssOrigin;

function useWebSocket() {
    useEffect(() => {
        const socket = new WebSocket(WS_URL);
        socket.onopen = () => {
            console.log("Connected to WebSocket:", WS_URL);
            socket.send("Hello from Client!");
        };

        socket.onclose = () => {
            console.warn("WebSocket connection closed.");
        };

        socket.onerror = (err) => {
            console.error("WebSocket error:", err);
        };

        return () => {
            socket.close();
        };
    }, []);
}

export default useWebSocket;