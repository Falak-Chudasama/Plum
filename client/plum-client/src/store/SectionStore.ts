import { create } from "zustand";

type SectionState = {
    section: string | null,
    setSection: (section: string) => void;
    removeSection: () => void;
};

const SectionStore = create<SectionState>((set) => ({
    section: 'mails',
    setSection: (section) => { set({ section }) },
    removeSection: () => { set({ section: null }) }
}));

export default SectionStore;