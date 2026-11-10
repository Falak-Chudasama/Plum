import { create } from "zustand";

type SideBarExpansionState = {
    isExpanded: boolean,
    setIsExpanded: (count: boolean) => void,
    resetIsExpanded: () => void
};

const SideBarExpansionStore = create<SideBarExpansionState>((set) => ({
    isExpanded: false,
    setIsExpanded: (isExpanded) => { set({ isExpanded }) },
    resetIsExpanded: () => { set({ isExpanded: false }) }
}));

export default SideBarExpansionStore;