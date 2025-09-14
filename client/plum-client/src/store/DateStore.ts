import { create } from "zustand";

type DateState = {
    date: Date,
    setDate: (date: Date) => void;
    removeDate: () => void;
};

const DateStore = create<DateState>((set) => ({
    date: new Date(),
    setDate: (date) => { set({ date }) },
    removeDate: () => { set({ date: new Date() }) }
}));

export default DateStore;