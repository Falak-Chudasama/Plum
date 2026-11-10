import { create } from "zustand";

type SubpageState = {
    subpage: string,
    setSubpage: (subpage: string) => void;
    removeSubpage: () => void;
};

const SubpageStore = create<SubpageState>((set) => ({
    subpage: 'mails',
    setSubpage: (subpage) => { set({ subpage }) },
    removeSubpage: () => { set({ subpage: 'mails' }) }
}));

export default SubpageStore;