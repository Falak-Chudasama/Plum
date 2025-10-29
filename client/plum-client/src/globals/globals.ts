type wsConnection = {
    socket: WebSocket | null;
    isConnected: boolean;
    sendMessage: (data: any) => void;
    sendPrompt: (prompt: string) => void;
}


const globals: {
    wsConnection: wsConnection | null,
} = {
    wsConnection: null,
};

export default globals;