import { create } from "zustand";
import type { ChatType } from "../types/types";
import utils from "../utils/utils";

const defaultChat: ChatType = {
    title: '',
    email: utils.parseGmailCookies().gmailCookie,
    userPrompts: [],
    systemPrompts: [],
    responses: [],
    archived: false,
    isViewed: true,
    messageCount: 0,
};

type ActiveChatState = {
    chat: ChatType,
    setChatState: (chat: ChatType) => void,
    resetActiveChatState: () => void
}

const ActiveChatStore = create<ActiveChatState>((set) => ({
    chat: defaultChat,
    setChatState: (chat) => { set({ chat }) },
    resetActiveChatState: () => { set({ chat: defaultChat }) }
}));

export default ActiveChatStore;