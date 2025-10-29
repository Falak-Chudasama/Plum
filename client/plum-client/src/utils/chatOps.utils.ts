import { useStore } from "zustand";
import ActiveChatStore from "../store/ActiveChatStore";

function addAIResponse(response: string, thought?: string) {
    const { chat, setChatState } = useStore(ActiveChatStore);

    const updatedChat = {
        ...chat,
        responses: [
            ...chat.responses,
            {
                response,
                thought,
                chatCount: chat.messageCount
            }
        ],
        messageCount: chat.messageCount + 1,
    }

    setChatState(updatedChat);
}

function addUserPrompt(prompt: string, intent: ('fetch_db' | 'craft_mail' | 'general'), confidence: number) {
    const { chat, setChatState } = useStore(ActiveChatStore);

    const updatedChat = {
        ...chat,
        userPrompts: [
            ...chat.userPrompts,
            {
                prompt,
                intention: {
                    intent,
                    confidence
                },
                chatCount: chat.messageCount
            }
        ],
        messageCount: chat.messageCount + 1,
    }

    setChatState(updatedChat);
}

const chatOps = {
    addAIResponse,
    addUserPrompt
};

export default chatOps