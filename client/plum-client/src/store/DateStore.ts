import { create } from "zustand";

type DateState = {
    date: string | null,
    setDate: (date: string | null) => void;
    removeDate: () => void;
};

const DateStore = create<DateState>((set) => ({
    date: null,
    setDate: (date) => { set({ date }) },
    removeDate: () => { set({ date: null }) }
}));

export default DateStore;