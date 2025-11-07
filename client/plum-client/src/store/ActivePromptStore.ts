import { create } from "zustand";
import type { UserPromptType } from "../types/types";

const defaultPrompt: UserPromptType = {
    prompt: '',
    intention: {
        intent: 'general',
        confidence: 1
    },
    chatCount: 1
}

type ActivePromptState = {
    prompt: UserPromptType,
    setPrompt: (prompt: UserPromptType) => void,
    resetPrompt: () => void
};

const ActivePromptStore = create<ActivePromptState>((set) => ({
    prompt: defaultPrompt,
    setPrompt: (prompt) => { set({ prompt }) },
    resetPrompt: () => { set({ prompt: defaultPrompt }) }
}));

export default ActivePromptStore;