import { create } from "zustand";

type SectionState = {
    section: string | null,
    setSection: (section: string | null) => void;
    removeSection: () => void;
};

const SectionStore = create<SectionState>((set) => ({
    section: null,
    setSection: (section) => { set({ section }) },
    removeSection: () => { set({ section: null }) }
}));

export default SectionStore;