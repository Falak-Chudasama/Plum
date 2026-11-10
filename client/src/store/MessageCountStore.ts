import { create } from "zustand";

type MessageCountState = {
    messageCount: number,
    setMessageCount: (messageCount: number) => void,
    resetMessageCount: () => void
};

const MessageCountStore = create<MessageCountState>((set) => ({
    messageCount: 0,
    setMessageCount: (count) => { set({ messageCount: count }) },
    resetMessageCount: () => { set({ messageCount: 0 }) }
}));

export default MessageCountStore;