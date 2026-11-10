import type { InboundEmailType } from "../types/types";
import { create } from "zustand";

type SelectedMailState = {
    mail: InboundEmailType | null,
    setMail: (mail: InboundEmailType) => void,
    removeMail: () => void
}

const useSelectedMailStore = create<SelectedMailState>((set) => ({
    mail: null,
    setMail: (mail: InboundEmailType) => { set({ mail }) },
    removeMail: () => { set({ mail: null }) }
}));

export default useSelectedMailStore;