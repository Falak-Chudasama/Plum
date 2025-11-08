import { useEffect, useState, useRef } from "react";
import constants from "../constants/constants";
import utils from "../utils/utils";
import socketMsgOps from "../ops/socketMsg.ops";
import ChatCountStore from "../store/ChatCountStore";
import { useStore } from "zustand";

const maxRetries = 1000;
const timeout = 5;
const WS_URL = constants.serverWssOrigin;

function useWebSocket() {
    const socketRef = useRef<WebSocket | null>(null);
    const socketRetries = useRef(0);
    const [isConnected, setIsConnected] = useState(false);
    const { chatCount } = useStore(ChatCountStore);

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

            if (response.type === 'RESPONSE') {
                socketMsgOps.response(data);
            } else if (response.type === 'THOUGHT') {
                socketMsgOps.thought(data);
            } else if (response.type === 'INFO') {
                socketMsgOps.info(data);
            } else if (response.type === 'SYSTEM') {
                socketMsgOps.system(data);
            } else if (response.type === 'ERROR') {
                socketMsgOps.error(data);
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
            socketRef.current.send(JSON.stringify(data));
        } else {
            console.warn("Socket not open yet, message dropped:", data);
        }
    };

    const sendCommand = (command: string) => {
        command = command.trim();
        if (!command) return;

        const promptObject = {
            type: 'COMMAND',
            command,
            message: command,
            email: utils.parseGmailCookies().gmailCookie,
        }

        console.log('Prompt sent: ' + prompt);
        sendMessage(promptObject);
    }

    const sendPrompt = (prompt: string) => {
        prompt = prompt.trim();
        if (!prompt) return;

        const promptObject = {
            type: 'PROMPT',
            prompt,
            message: prompt,
            email: utils.parseGmailCookies().gmailCookie,
            chatCount
        }

        console.log('Prompt sent: ' + prompt);
        sendMessage(promptObject);
    }

    return { socket: socketRef.current, isConnected, sendMessage, sendCommand, sendPrompt };
}

export default useWebSocket;