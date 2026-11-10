import { create } from "zustand";

type Gmail = {
    gmailId: string | null;
    profileUrl: string | null;
};

type GmailState = {
    gmail: Gmail | null;
    setGmail: (gmail: Gmail | null) => void;
    removeGmail: () => void;
};

const useGmailStore = create<GmailState>((set) => ({
    gmail: null,
    setGmail: (gmail) => set({ gmail }),
    removeGmail: () => set({ gmail: null }),
}));

export default useGmailStore;
