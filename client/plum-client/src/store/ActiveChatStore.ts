import { create } from "zustand";
import type { ChatType } from "../types/types";
import utils from "../utils/utils";

// const defaultChat: ChatType = {
//     title: '',
//     email: utils.parseGmailCookies().gmailCookie,
//     userPrompts: [],
//     systemPrompts: [],
//     responses: [],
//     archived: false,
//     isViewed: true,
//     messageCount: 0,
// };

const defaultChat: ChatType = {
    title: "Project Extension Request",
    email: utils.parseGmailCookies().gmailCookie,
    archived: false,
    isViewed: true,
    messageCount: 3,
    lastMessageAt: new Date(),

    userPrompts: [
        {
            prompt: "Hey Plum, what’s the weather like today?",
            intention: { intent: "general", confidence: 0.97 },
            chatCount: 1,
        },
        {
            prompt: "Fetch all users from the database.",
            intention: { intent: "fetch_db", confidence: 0.95 },
            chatCount: 2,
        },
        {
            prompt: "Write an email to my professor requesting an extension for my project submission.",
            intention: { intent: "craft_email", confidence: 0.98 },
            chatCount: 3,
        },
    ],

    systemPrompts: [
        {
            prompt: "System initialized with general conversation context.",
            chatCount: 1,
        },
        {
            prompt: "System context switched to database retrieval mode.",
            chatCount: 2,
        },
        {
            prompt: "System detected email crafting intent. Activating craft mode.",
            chatCount: 3,
        },
    ],

    responses: [
        {
            response: "It’s a bright day with clear skies and a temperature around 28°C.",
            thought: "Simple factual response using general context.",
            craftedMail: undefined,
            query: undefined,
            fetchedMails: undefined,
            chatCount: 1,
            modelResponded: "gpt-5-mini",
        },
        {
            response: "Fetched 15 users successfully from the 'users' collection.",
            thought: "Executed mock DB fetch operation with success.",
            query: {
                query: "SELECT * FROM users;",
                isSuccess: true,
                resultCount: 15,
            },
            fetchedMails: undefined,
            craftedMail: undefined,
            chatCount: 2,
            modelResponded: "gpt-5-mini",
        },
        {
            response: "Got it. I’ve prepared a professional email requesting your project extension.",
            thought: "User requested an email to professor. Generated polite and concise draft.",
            craftedMail: {
                from: "tony@example.com",
                to: ["david.baker@somaiya.edu"],
                cc: ["coordinator@somaiya.edu"],
                bcc: [],
                replyTo: "",
                subject: "Request for Project Submission Extension",
                body: `Dear Professor Baker,

I hope this message finds you well. I am writing to kindly request an extension for my project submission due to some unexpected system issues. I’ve completed most of the work and only need two additional days to finalize it properly.

I sincerely apologize for the inconvenience and appreciate your understanding.

Best regards,
Tony`,
                category: ["Academic"],
                status: "draft",
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            query: undefined,
            fetchedMails: undefined,
            chatCount: 3,
            modelResponded: "gpt-5",
        },
    ],
};


type ActiveChatState = {
    chat: ChatType,
    setChatState: (chat: ChatType) => void,
    resetActiveChatState: () => void
};

const ActiveChatStore = create<ActiveChatState>((set) => ({
    chat: defaultChat,
    setChatState: (chat) => { set({ chat }) },
    resetActiveChatState: () => { set({ chat: defaultChat }) }
}));

export default ActiveChatStore;