import { create } from "zustand";
import type { PopupFormArgs } from "../types/types";

type PopupFormState = {
    args: PopupFormArgs,
    setArgs: (args: PopupFormArgs) => void;
    removeArgs: () => void;
};

const PopupFormStore = create<PopupFormState>((set) => ({
    args: {
        formType: 'create-category',
        load: false,
        category: null
    },
    setArgs: ({ formType, load, category }) => { set({ args: { formType, load, category } }) },
    removeArgs: () => { set({ args: {
        formType: 'create-category',
        load: false,
        category: null
    } }) }
}));

export default PopupFormStore;