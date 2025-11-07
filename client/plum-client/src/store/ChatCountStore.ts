import { create } from "zustand";

type ChatCountState = {
    chatCount: number,
    setChatCount: (count: number) => void,
    resetChatCount: () => void
};

const ChatCountStore = create<ChatCountState>((set) => ({
    chatCount: 0,
    setChatCount: (chatCount) => { set({ chatCount }) },
    resetChatCount: () => { set({ chatCount: 0 }) }
}));

export default ChatCountStore;