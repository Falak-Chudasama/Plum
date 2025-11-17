import { create } from "zustand";
import type { ChatMeta } from "../types/types";

type ChatListType = {
    chats: ChatMeta[],
    cursor: Date | null
}

const defaultChatList = {
    chats: [],
    cursor: null
}

type ChatState = {
    chatList: ChatListType,
    setChatList: (chatList: ChatListType) => void,
    resetChatList: () => void
};

const ChatStore = create<ChatState>((set) => ({
    chatList: defaultChatList,
    setChatList: (chatList) => { set({ chatList }) },
    resetChatList: () => { set({ chatList: defaultChatList }) }
}));

export default ChatStore;