import { create } from "zustand";

interface SystemMsgType {
    message: string,
    show?: boolean,
    isLoading?: boolean
}

const defaultSystemMsg = {
    message: '',
    show: false,
    isLoading: false
}

interface SystemMsgState {
    message: SystemMsgType,
    setSystemMsg: (msg: SystemMsgType) => void,
    resetSystemMsg: () => void
}

const SystemMsgStore = create<SystemMsgState>((set) => ({
    message: defaultSystemMsg,
    setSystemMsg: (msg) => set({ message: msg }),
    resetSystemMsg: () => set({ message: defaultSystemMsg })
}));

export default SystemMsgStore;