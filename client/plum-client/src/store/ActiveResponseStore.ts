import { create } from "zustand";
import type { ResponseType } from "../types/types";

// TODO: Handle THOUGHT

const defaultResponse: ResponseType = {
    response: '',
    chatCount: 1
}

type ActiveResponseState = {
    response: ResponseType,
    setResponse: (response: ResponseType) => void,
    resetResponse: () => void
}

const ActiveResponseStore = create<ActiveResponseState>((set) => ({
    response: defaultResponse,
    setResponse: (response: ResponseType) => { set({ response }) },
    resetResponse: () => { set({ response: defaultResponse }) }
}));

export default ActiveResponseStore;