import { create } from "zustand";
import type { ChatMeta } from "../types/types";

type ChatListType = {
    chats: ChatMeta[];
    cursor: string | null;
    hasMore: boolean;
};

const defaultChatList: ChatListType = {
    chats: [],
    cursor: null,
    hasMore: false
};

type ChatState = {
    chatList: ChatListType;
    setChatList: (chatList: ChatListType) => void;
    appendChatList: (incoming: ChatListType) => void;
    resetChatList: () => void;
};

const ChatStore = create<ChatState>((set, get) => ({
    chatList: defaultChatList,

    setChatList: (chatList) => {
        set({ chatList });
    },

    appendChatList: (incoming) => {
        const current = get().chatList;
        const existingIds = new Set(current.chats.map(c => c._id));
        const newChats = incoming.chats.filter(c => !existingIds.has(c._id));
        set({
            chatList: {
                chats: [...current.chats, ...newChats],
                cursor: incoming.cursor,
                hasMore: incoming.hasMore
            }
        });
    },

    resetChatList: () => {
        set({ chatList: defaultChatList });
    }
}));

export default ChatStore;