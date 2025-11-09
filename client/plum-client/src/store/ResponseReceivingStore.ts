import { create } from "zustand";

type ResponseReceivingState = {
    receivingResponse: boolean,
    setReceivingResponse: (category: boolean) => void;
    removeReceivingResponse: () => void;
};

const ResponseReceivingStore = create<ResponseReceivingState>((set) => ({
    receivingResponse: false,
    setReceivingResponse: (receivingResponse) => { set({ receivingResponse }) },
    removeReceivingResponse: () => { set({ receivingResponse: false }) }
}));

export default ResponseReceivingStore;