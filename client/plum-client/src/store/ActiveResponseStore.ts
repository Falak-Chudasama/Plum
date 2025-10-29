import { create } from "zustand";

type ActiveResponseState = {
    response: string,
    setResponse: (chat: string) => void,
    resetResponse: () => void
}

const ActiveResponseStore = create<ActiveResponseState>((set) => ({
    response: '',
    setResponse: (response) => { set((state) => ({ response: state.response + response })) },
    resetResponse: () => { set({ response: '' }) }
}));

export default ActiveResponseStore;