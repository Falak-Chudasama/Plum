import { create } from "zustand";
import { type InboundEmailType } from "../types/types";

type EmailsState = {
    emails: InboundEmailType[],
    setEmails: (email: InboundEmailType[]) => void;
    removeEmails: () => void;
};

const EmailsStore = create<EmailsState>((set) => ({
    emails: [],
    setEmails: (newEmails) => { set({ emails: newEmails }) },
    removeEmails: () => { set({ emails: [] }) }
}));

export default EmailsStore;