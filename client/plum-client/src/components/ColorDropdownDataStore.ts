import { create } from "zustand";

type stateType = {
    selectedColor: {
        value: string,
        label: string,
    },
    setSelectedColor: ((data: { value: string, label: string }) => void)
};

type ColorDropdownDataState = {
    state: stateType | null,
    setState: (state: stateType) => void,
    resetState: () => void
};

const ColorDropdownDataStore = create<ColorDropdownDataState>((set) => ({
    state: null,
    setState: (state: stateType) => { set({ state }) },
    resetState: () => { set({ state: null }) }
}));

export default ColorDropdownDataStore;