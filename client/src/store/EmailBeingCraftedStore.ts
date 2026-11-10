import { create } from "zustand";

type ChatCountState = {
    isCrafted: boolean,
    setIsCrafted: (count: boolean) => void,
    resetIsCrafted: () => void
};

const EmailBeingCrafted = create<ChatCountState>((set) => ({
    isCrafted: false,
    setIsCrafted: (isCrafted) => { set({ isCrafted }) },
    resetIsCrafted: () => { set({ isCrafted: false }) }
}));

export default EmailBeingCrafted;