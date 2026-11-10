import { create } from "zustand";

type MailsTabState = {
    tab: string,
    setTab: (section: string) => void;
    removeTab: () => void;
};

const MailsTabsStore = create<MailsTabState>((set) => ({
    tab: 'inbox',
    setTab: (section) => { set({ tab: section }) },
    removeTab: () => { set({ tab: 'inbox' }) }
}));

export default MailsTabsStore;