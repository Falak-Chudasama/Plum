import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import WebSocket from "ws";
import mongoose from "mongoose";
import http from "http";
import app from "../src/app/app";
import clientWss from "../src/sockets/client.socket";
import Chats from "../src/models/chat";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:4090/plum";
let httpServer: http.Server;
const HTTP_PORT = 4055;
const WS_PORT = 4065; // clientWss is running on this port

const USER_A = "concurrent-user-a@plum.com";
const USER_B = "concurrent-user-b@plum.com";

before(async () => {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(MONGO_URI);
    }
    await Chats.deleteMany({ email: { $in: [USER_A, USER_B] } });

    await new Promise<void>((resolve) => {
        httpServer = app.listen(HTTP_PORT, () => resolve());
    });
});

after(async () => {
    await Chats.deleteMany({ email: { $in: [USER_A, USER_B] } });
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    clientWss.close();
    await mongoose.disconnect();
});

test("Chat WebSocket: Simultaneous Multi-Client Connections & Isolation", async () => {
    // 1. Connect Client A
    const clientA = new WebSocket(`ws://localhost:${WS_PORT}`);
    await new Promise<void>((resolve, reject) => {
        clientA.on("open", resolve);
        clientA.on("error", reject);
    });

    // 2. Connect Client B simultaneously
    const clientB = new WebSocket(`ws://localhost:${WS_PORT}`);
    await new Promise<void>((resolve, reject) => {
        clientB.on("open", resolve);
        clientB.on("error", reject);
    });

    // Verify BOTH are open simultaneously (no auto-kicking!)
    assert.equal(clientA.readyState, WebSocket.OPEN, "Client A must remain OPEN");
    assert.equal(clientB.readyState, WebSocket.OPEN, "Client B must remain OPEN");

    const messagesA: any[] = [];
    const messagesB: any[] = [];

    clientA.on("message", (raw) => {
        messagesA.push(JSON.parse(raw.toString()));
    });

    clientB.on("message", (raw) => {
        messagesB.push(JSON.parse(raw.toString()));
    });

    // 3. Client A sends a prompt
    clientA.send(JSON.stringify({
        type: "PROMPT",
        prompt: "Hello Plum from Account A",
        email: USER_A,
        chatCount: 0,
    }));

    // Wait for Client A to receive intent or response
    await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
            if (messagesA.some(m => m.type === "SYSTEM" || m.type === "RESPONSE" || m.type === "ERROR")) {
                clearInterval(interval);
                resolve();
            }
        }, 50);
    });

    // Verify Client A received messages
    assert.ok(messagesA.length > 0, "Client A received messages");

    // CRITICAL: Verify Client B received ZERO messages meant for Client A!
    assert.equal(messagesB.length, 0, "Client B must NOT receive any messages emitted to Client A");

    console.log("SUCCESS: Both Client A and Client B connected simultaneously without disconnects!");
    console.log("SUCCESS: Client A received its response, and Client B received ZERO leaked messages!");

    // Clean up
    clientA.close();
    clientB.close();
});
