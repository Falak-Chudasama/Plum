import { create } from "zustand";

type AlertSwitchDataState = {
    alertState: boolean,
    setAlertState: (alertState: boolean) => void,
    resetAlertState: () => void
};

const AlertSwitchDataStore = create<AlertSwitchDataState>((set) => ({
    alertState: false,
    setAlertState: (alert) => { set({ alertState: alert }) },
    resetAlertState: () => { set({ alertState: false }) }
}));

export default AlertSwitchDataStore;