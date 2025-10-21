import { create } from "zustand";

type stateType = {
    value: string,
    label: string,
};

const defaultState: stateType = {
    value: 'gray',
    label: 'Gray'
};

type ColorDropdownDataState = {
    selectedColor: stateType,
    setSelectedColor: (state: stateType) => void,
    resetSelectedColor: () => void
};

const ColorDropdownDataStore = create<ColorDropdownDataState>((set) => ({
    selectedColor: defaultState,
    setSelectedColor: (state: stateType) => { set({ selectedColor: state }) },
    resetSelectedColor: () => { set({ selectedColor: defaultState }) }
}));

export default ColorDropdownDataStore;