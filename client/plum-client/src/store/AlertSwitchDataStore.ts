import { create } from "zustand";

type stateType = {
    isChecked: boolean,
    setIsChecked: ((data: boolean) => void)
};

type AlertSwitchDataState = {
    alertState: stateType | null,
    setAlertState: (state: stateType) => void,
    resetAlertState: () => void
};

const AlertSwitchDataStore = create<AlertSwitchDataState>((set) => ({
    alertState: null,
    setAlertState: (state: stateType) => { set({ alertState: state }) },
    resetAlertState: () => { set({ alertState: null }) }
}));

export default AlertSwitchDataStore;