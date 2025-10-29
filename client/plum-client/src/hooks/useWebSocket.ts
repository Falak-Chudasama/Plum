import { useEffect, useState, useRef } from "react";
import constants from "../constants/constants";
import utils from "../utils/utils";
import { useStore } from "zustand";
import ActiveResponseStore from "../store/ActiveResponseStore";

const maxRetries = 1000;
const timeout = 5;
const WS_URL = constants.serverWssOrigin;

function useWebSocket() {
    const socketRef = useRef<WebSocket | null>(null);
    const socketRetries = useRef(0);
    const [isConnected, setIsConnected] = useState(false);

    const { setResponse, resetResponse } = useStore(ActiveResponseStore);

    const initSocket = () => {
        const socket = new WebSocket(WS_URL);
        socketRef.current = socket;

        socket.onopen = () => {
            console.log("Connected to WebSocket:", WS_URL);
            setIsConnected(true);
            socketRetries.current = 0;
        };

        socket.onmessage = (event) => {
            const data = event.data;
            const response = JSON.parse(data);
            if (response.type === 'RESPONSE' && !response.done) {
                setResponse(response.message);
            }
        }

        socket.onclose = () => {
            setIsConnected(false);
            if (socketRetries.current < maxRetries) {
                setTimeout(() => {
                    console.warn("WebSocket connection closed. Retrying connection...");
                    socketRetries.current++;
                    initSocket();
                }, timeout * 1000);
            } else {
                console.warn("WebSocket connection closed.");
            }
        };

        socket.onerror = (err) => {
            console.error("WebSocket error:", err);
        };
    }

    useEffect(() => {
        initSocket();

        return () => {
            console.log("Cleaning up WebSocket...");
            socketRef.current?.close();
        };
    }, []);

    const sendMessage = (data: any) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            resetResponse();
            socketRef.current.send(JSON.stringify(data));
        } else {
            console.warn("Socket not open yet, message dropped:", data);
        }
    };

    const sendPrompt = (prompt: string) => {
        prompt = prompt.trim();
        if (!prompt) return;

        const promptObject = {
            type: 'PROMPT',
            message: prompt,
            email: utils.parseGmailCookies().gmailCookie,
        }

        console.log('Prompt sent: ' + prompt);
        sendMessage(promptObject);
    }

    return { socket: socketRef.current, isConnected, sendMessage, sendPrompt };
}

export default useWebSocket;