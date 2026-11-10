import { create } from 'zustand';
import { api } from '../lib/api';
import type { MailboxItem, UserProfile, OutboundEmailItem } from '../lib/api';

interface PlumStoreState {
  user: UserProfile | null;
  mailboxes: MailboxItem[];
  activeMailbox: string;
  isLoading: boolean;
  isComposerOpen: boolean;
  composerData: Partial<OutboundEmailItem> | null;
  selectedCategoryFilter: string;

  // Actions
  loadSession: () => Promise<void>;
  setActiveMailbox: (email: string) => void;
  refreshMailboxes: () => Promise<void>;
  openComposer: (initialData?: Partial<OutboundEmailItem>) => void;
  closeComposer: () => void;
  setCategoryFilter: (category: string) => void;
  logout: () => Promise<void>;
}

export const usePlumStore = create<PlumStoreState>((set, get) => ({
  user: null,
  mailboxes: [],
  activeMailbox: '',
  isLoading: true,
  isComposerOpen: false,
  composerData: null,
  selectedCategoryFilter: 'ALL',

  loadSession: async () => {
    set({ isLoading: true });
    try {
      const user = await api.getMe();
      const mailboxes = await api.getMailboxes();

      let active = '';
      const savedMailbox = localStorage.getItem('plum_active_mailbox');
      if (savedMailbox && mailboxes.some((m) => m.email === savedMailbox)) {
        active = savedMailbox;
      } else {
        const primary = mailboxes.find((m) => m.isPrimary);
        active = primary ? primary.email : mailboxes[0]?.email || user.email;
        if (active) {
          localStorage.setItem('plum_active_mailbox', active);
        }
      }

      set({
        user,
        mailboxes,
        activeMailbox: active,
        isLoading: false,
      });
    } catch (err) {
      console.warn('Failed to load Plum session:', err);
      set({ user: null, mailboxes: [], isLoading: false });
    }
  },

  setActiveMailbox: (email: string) => {
    try {
      localStorage.setItem('plum_active_mailbox', email);
    } catch (e) {}
    set({ activeMailbox: email });
  },

  refreshMailboxes: async () => {
    try {
      const mailboxes = await api.getMailboxes();
      const currentActive = get().activeMailbox;
      let newActive = currentActive;

      if (!mailboxes.some((m) => m.email === currentActive)) {
        const primary = mailboxes.find((m) => m.isPrimary);
        newActive = primary ? primary.email : mailboxes[0]?.email || '';
        if (newActive) {
          localStorage.setItem('plum_active_mailbox', newActive);
        }
      }

      set({ mailboxes, activeMailbox: newActive });
    } catch (err) {
      console.error('Error refreshing mailboxes:', err);
    }
  },

  openComposer: (initialData?: Partial<OutboundEmailItem>) => {
    set({
      isComposerOpen: true,
      composerData: initialData || null,
    });
  },

  closeComposer: () => {
    set({
      isComposerOpen: false,
      composerData: null,
    });
  },

  setCategoryFilter: (category: string) => {
    set({ selectedCategoryFilter: category });
  },

  logout: async () => {
    try {
      await api.logout();
    } catch (e) {}
    try {
      localStorage.removeItem('plum_active_mailbox');
    } catch (e) {}
    set({ user: null, mailboxes: [], activeMailbox: '' });
    window.location.href = '/signin';
  },
}));
