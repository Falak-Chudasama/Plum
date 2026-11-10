import { useEffect, useState, useRef } from "react";
import constants from "../constants/constants";
import utils from "../utils/utils";
import socketMsgOps from "../ops/socketMsg.ops";
import { useStore } from "zustand";
import chatOps from "../ops/chat.ops";
import ActiveChatStore from "../store/ActiveChatStore";

const maxRetries = 1000;
const timeout = 5;
const WS_URL = constants.serverWssOrigin;

function ensureChatReady(maxWait = 50000, step = 100): Promise<void> {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
            const { chat } = ActiveChatStore.getState();
            if (chat?._id) return resolve();
            if (Date.now() - start >= maxWait)
                return reject(new Error("Chat _id not ready in time"));
            setTimeout(check, step);
        };
        check();
    });
}

function useWebSocket() {
    const socketRef = useRef<WebSocket | null>(null);
    const socketRetries = useRef(0);
    const [isConnected, setIsConnected] = useState(false);
    const { chat } = useStore(ActiveChatStore);

    let chatCount = useRef(chat.messageCount);
    let chatTitle = useRef(chat.title);

    useEffect(() => {
        chatCount.current = chat.messageCount;
    }, [chat.messageCount]);

    useEffect(() => {
        chatTitle.current = chat.title;
    }, [chat.title]);

    const initSocket = () => {
        const socket = new WebSocket(WS_URL);
        socketRef.current = socket;

        socket.onopen = () => {
            console.log("Connected to WebSocket:", WS_URL);
            setIsConnected(true);
            socketRetries.current = 0;
        };

        socket.onmessage = async (event) => {
            const data = event.data;
            const response = JSON.parse(data);

            if (response.type === "RESPONSE") {
                if (response.done) {
                    await ensureChatReady();
                    socketMsgOps.response(response);
                } else {
                    socketMsgOps.response(response);
                }
            } else if (response.type === "THOUGHT") {
                socketMsgOps.thought(response);
            } else if (response.type === "INFO") {
                socketMsgOps.info(response);
            } else if (response.type === "SYSTEM") {
                await socketMsgOps.system(response);
            } else if (response.type === "ERROR") {
                socketMsgOps.error(response);
            }
        };

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
            chatCount: chatCount.current
        }

        chatOps.createPrompt(prompt);
        sendMessage(promptObject);
    }

    return { socket: socketRef.current, isConnected, sendMessage, sendCommand, sendPrompt };
}

export default useWebSocket;