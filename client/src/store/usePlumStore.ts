import { create } from 'zustand';
import { api } from '../lib/api';
import type {
  MailboxItem,
  UserProfile,
  OutboundEmailItem,
  ChatSession,
  ChatToolEvent,
} from '../lib/api';

const ACTIVE_CHAT_STORAGE_KEY = 'plum_active_chat_id';
const SIDEBAR_OPEN_STORAGE_KEY = 'plum_chat_sidebar_open';

export interface StoreChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thought?: string;
  craftedMail?: any;
  toolEvents?: ChatToolEvent[];
  ragNotes?: Array<{ id: string; title: string; content?: string; denseScore?: number; bm25Score?: number }>;
  timestamp?: string;
}

function getScopedChatKey(userEmail?: string | null): string {
  return userEmail ? `${ACTIVE_CHAT_STORAGE_KEY}:${userEmail.toLowerCase().trim()}` : ACTIVE_CHAT_STORAGE_KEY;
}

function readStoredChatId(userEmail?: string | null): string | null {
  try {
    if (userEmail) {
      const scoped = localStorage.getItem(getScopedChatKey(userEmail));
      if (scoped) return scoped;
    }
    return sessionStorage.getItem(ACTIVE_CHAT_STORAGE_KEY) || localStorage.getItem(ACTIVE_CHAT_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

function writeStoredChatId(id: string | null, userEmail?: string | null) {
  try {
    const scopedKey = getScopedChatKey(userEmail);
    if (id) {
      sessionStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, id);
      localStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, id);
      if (userEmail) {
        localStorage.setItem(scopedKey, id);
      }
    } else {
      sessionStorage.removeItem(ACTIVE_CHAT_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_CHAT_STORAGE_KEY);
      if (userEmail) {
        localStorage.removeItem(scopedKey);
      }
    }
  } catch {
    // ignore storage errors
  }
}

function readStoredSidebarOpen(): boolean {
  try {
    const saved = localStorage.getItem(SIDEBAR_OPEN_STORAGE_KEY);
    if (saved === 'true') return true;
    if (saved === 'false') return false;
  } catch {}
  return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
}

function writeStoredSidebarOpen(isOpen: boolean) {
  try {
    localStorage.setItem(SIDEBAR_OPEN_STORAGE_KEY, isOpen ? 'true' : 'false');
  } catch {}
}

function normalizeChatMessages(chat: any): StoreChatMessage[] {
  const baseKey = String(chat?._id || chat?.session_id || 'chat');
  const loaded: StoreChatMessage[] = [];
  if (Array.isArray(chat?.messages) && chat.messages.length > 0) {
    chat.messages.forEach((m: any, idx: number) => {
      loaded.push({
        id: `${baseKey}-msg-${idx}`,
        role: m.role || 'user',
        content: m.content || '',
        craftedMail: m.craftedMail,
        toolEvents: m.toolEvents,
        ragNotes: m.ragNotes,
        thought: m.thought && m.thought !== '<no_thoughts>' ? m.thought : undefined,
        timestamp: m.created_at,
      });
    });
    return loaded;
  }

  const prompts = chat?.userPrompts || [];
  const responses = chat?.responses || [];
  const maxLen = Math.max(prompts.length, responses.length);

  for (let i = 0; i < maxLen; i++) {
    if (prompts[i]?.prompt) {
      loaded.push({
        id: `${baseKey}-prompt-${i}`,
        role: 'user',
        content: prompts[i].prompt,
      });
    }
    if (responses[i] && (responses[i].response || responses[i].craftedMail)) {
      loaded.push({
        id: `${baseKey}-resp-${i}`,
        role: 'assistant',
        content: responses[i].response || '',
        craftedMail: responses[i].craftedMail,
        thought:
          responses[i].thought && responses[i].thought !== '<no_thoughts>'
            ? responses[i].thought
            : undefined,
      });
    }
  }

  return loaded;
}

let activeAbortController: AbortController | null = null;
let inflightSelectId: string | null = null;

function dedupeChatsList(raw: ChatSession[]): ChatSession[] {
  const deduped: ChatSession[] = [];
  const seenIds = new Set<string>();
  const seenSessions = new Set<string>();
  for (const item of raw || []) {
    if (!item?._id) continue;
    const id = String(item._id);
    const sid = item.session_id ? String(item.session_id) : id;
    if (seenIds.has(id) || seenSessions.has(sid)) continue;
    seenIds.add(id);
    seenSessions.add(sid);
    deduped.push(item);
  }
  return deduped;
}

function upsertChatSummary(
  chats: ChatSession[],
  entry: Partial<ChatSession> & { _id: string },
  bumpToTop: boolean = false
): ChatSession[] {
  const targetId = String(entry._id);
  const targetSession = entry.session_id ? String(entry.session_id) : targetId;
  const existing = chats.find(
    (c) => String(c._id) === targetId || (c.session_id && String(c.session_id) === targetSession)
  );
  const merged: ChatSession = {
    ...(existing || { _id: targetId, session_id: targetSession, title: 'New Chat' }),
    ...entry,
    _id: existing?._id || targetId,
    session_id: existing?.session_id || targetSession,
  };
  const rest = chats.filter(
    (c) => String(c._id) !== targetId && !(c.session_id && String(c.session_id) === targetSession)
  );
  if (bumpToTop) {
    return dedupeChatsList([merged, ...rest]);
  }
  if (!existing) {
    return dedupeChatsList([merged, ...rest]);
  }
  return dedupeChatsList(
    chats.map((c) =>
      String(c._id) === targetId || (c.session_id && String(c.session_id) === targetSession) ? merged : c
    )
  );
}

interface PlumStoreState {
  user: UserProfile | null;
  mailboxes: MailboxItem[];
  activeMailbox: string;
  isLoading: boolean;
  isComposerOpen: boolean;
  composerData: Partial<OutboundEmailItem> | null;
  selectedCategoryFilter: string;

  // Persistent AI Chat Workspace State (survives navigation across pages & reloads)
  chats: ChatSession[];
  activeChatId: string | null;
  chatMessages: StoreChatMessage[];
  isChatLoading: boolean;
  isChatGenerating: boolean;
  chatStatusMessage: string | null;
  chatPromptInput: string;
  isChatSidebarOpen: boolean;
  chatSearchQuery: string;
  chatOpenThoughts: Record<string, boolean>;
  chatScrollPositions: Record<string, number>;

  // Actions
  loadSession: () => Promise<void>;
  setActiveMailbox: (email: string) => void;
  refreshMailboxes: () => Promise<void>;
  markMailboxExpired: (mailboxEmail?: string) => void;
  openComposer: (initialData?: Partial<OutboundEmailItem>) => void;
  closeComposer: () => void;
  setCategoryFilter: (category: string) => void;
  logout: () => Promise<void>;

  // Persistent Chat Actions
  loadChatsList: () => Promise<void>;
  hydrateActiveChat: (requestedId?: string | null) => Promise<void>;
  selectChat: (id: string) => Promise<void>;
  startNewChat: () => void;
  setChatPromptInput: (value: string) => void;
  setChatSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setChatSearchQuery: (query: string) => void;
  toggleChatThought: (msgId: string) => void;
  setChatScrollPosition: (threadKey: string, scrollTop: number) => void;
  sendChatMessage: (params: {
    text: string;
    onToastError?: (msg: string) => void;
    onNotesChanged?: () => void;
  }) => Promise<string | null>;
  stopChatGeneration: () => void;
  updateChatMessageCraftedMail: (msgId: string, status: string) => void;
  deleteChatThread: (id: string) => Promise<void>;
}

export const usePlumStore = create<PlumStoreState>((set, get) => ({
  user: null,
  mailboxes: [],
  activeMailbox: '',
  isLoading: true,
  isComposerOpen: false,
  composerData: null,
  selectedCategoryFilter: 'ALL',

  chats: [],
  activeChatId: readStoredChatId(),
  chatMessages: [],
  isChatLoading: false,
  isChatGenerating: false,
  chatStatusMessage: null,
  chatPromptInput: '',
  isChatSidebarOpen: readStoredSidebarOpen(),
  chatSearchQuery: '',
  chatOpenThoughts: {},
  chatScrollPositions: {},

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

      const persistedChatId = get().activeChatId || readStoredChatId(user?.email);

      set({
        user,
        mailboxes,
        activeMailbox: active,
        activeChatId: persistedChatId,
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

  markMailboxExpired: (mailboxEmail?: string) => {
    const target = (mailboxEmail || get().activeMailbox || '').toLowerCase();
    if (!target) return;
    set((state) => ({
      mailboxes: state.mailboxes.map((m) =>
        m.email.toLowerCase() === target
          ? { ...m, status: 'expired', tokenHealth: 'expired', refreshTokenRemainingSeconds: 0 }
          : m
      ),
    }));
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

  loadChatsList: async () => {
    try {
      const raw = await api.getChats();
      set({ chats: dedupeChatsList(raw || []) });
    } catch {
      // non-fatal
    }
  },

  hydrateActiveChat: async (requestedId?: string | null) => {
    const userEmail = get().user?.email;
    const targetId = requestedId || get().activeChatId || readStoredChatId(userEmail);
    if (!targetId) return;

    // Keep loaded thread or in-flight generation untouched when returning from another page
    if (
      get().activeChatId === targetId &&
      (get().chatMessages.length > 0 || get().isChatGenerating || inflightSelectId === targetId)
    ) {
      return;
    }

    await get().selectChat(targetId);
  },

  selectChat: async (id: string) => {
    if (!id) return;
    if (inflightSelectId === id && get().isChatLoading) return;

    const userEmail = get().user?.email;
    inflightSelectId = id;
    writeStoredChatId(id, userEmail);
    set({ activeChatId: id, isChatLoading: true, chatStatusMessage: null });

    try {
      const chat = await api.getChatById(id);
      if (!chat) {
        writeStoredChatId(null, userEmail);
        set({ activeChatId: null, chatMessages: [], isChatLoading: false });
        return;
      }

      if (get().activeChatId !== id) return;
      const canonicalId = String(chat._id || id);
      writeStoredChatId(canonicalId, userEmail);
      const loaded = normalizeChatMessages(chat);
      set((state) => ({
        activeChatId: canonicalId,
        chatMessages: loaded,
        isChatLoading: false,
        chats: upsertChatSummary(state.chats, {
          _id: canonicalId,
          session_id: chat.session_id || canonicalId,
          title: chat.title || 'New Chat',
          updated_at: chat.updated_at || chat.created_at,
          lastMessageAt: chat.lastMessageAt,
        }),
      }));
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404 || status === 403) {
        writeStoredChatId(null, userEmail);
        set({ activeChatId: null, chatMessages: [], isChatLoading: false });
      } else {
        set({ isChatLoading: false });
      }
    } finally {
      if (inflightSelectId === id) {
        inflightSelectId = null;
      }
    }
  },

  startNewChat: () => {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
    inflightSelectId = null;
    writeStoredChatId(null, get().user?.email);
    set({
      activeChatId: null,
      chatMessages: [],
      isChatGenerating: false,
      isChatLoading: false,
      chatStatusMessage: null,
      chatOpenThoughts: {},
    });
  },

  setChatPromptInput: (value: string) => {
    set({ chatPromptInput: value });
  },

  setChatSidebarOpen: (open) => {
    const next = typeof open === 'function' ? open(get().isChatSidebarOpen) : open;
    writeStoredSidebarOpen(next);
    set({ isChatSidebarOpen: next });
  },

  setChatSearchQuery: (query: string) => {
    set({ chatSearchQuery: query });
  },

  toggleChatThought: (msgId: string) => {
    set((state) => ({
      chatOpenThoughts: {
        ...state.chatOpenThoughts,
        [msgId]: !state.chatOpenThoughts[msgId],
      },
    }));
  },

  setChatScrollPosition: (threadKey: string, scrollTop: number) => {
    set((state) => ({
      chatScrollPositions: {
        ...state.chatScrollPositions,
        [threadKey]: scrollTop,
      },
    }));
  },

  sendChatMessage: async ({ text, onToastError, onNotesChanged }) => {
    const trimmed = text.trim();
    if (!trimmed || get().isChatGenerating) return null;

    const currentChatId = get().activeChatId;
    const { user, activeMailbox } = get();
    const turnId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `turn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const userMessage: StoreChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    const assistantMessageId = `asst-${Date.now()}`;

    const pendingTools: ChatToolEvent[] = [];

    const controller = new AbortController();
    activeAbortController = controller;

    set((state) => ({
      chatPromptInput: '',
      isChatGenerating: true,
      chatStatusMessage: 'Thinking...',
      chatMessages: [
        ...state.chatMessages,
        userMessage,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
        },
      ],
    }));

    let resolvedChatId = currentChatId;

    try {
      await api.streamPlumChat({
        prompt: trimmed,
        chatId: currentChatId,
        turnId,
        mailboxEmail: activeMailbox || user?.email,
        email: user?.email,
        signal: controller.signal,
        onEvent: (payload) => {
          if (payload.type === 'INFO') {
            set({ chatStatusMessage: payload.showMessage || payload.message || 'Working...' });
          } else if (payload.type === 'SYSTEM') {
            if (payload.subtype === 'SESSION' && payload.chatId) {
              resolvedChatId = payload.chatId;
              writeStoredChatId(payload.chatId, user?.email);
              const nowIso = new Date().toISOString();
              set((state) => {
                const existing = state.chats.find(
                  (c) => String(c._id) === String(payload.chatId) || String(c.session_id) === String(payload.chatId)
                );
                return {
                  activeChatId: payload.chatId,
                  chats: upsertChatSummary(
                    state.chats,
                    {
                      _id: payload.chatId,
                      session_id: payload.chatId,
                      title: existing?.title || trimmed.slice(0, 42) || 'New Chat',
                      updated_at: nowIso,
                      lastMessageAt: nowIso,
                    },
                    true
                  ),
                };
              });
            } else if (payload.subtype === 'RAG_CONTEXT' && Array.isArray(payload.notes)) {
              set((state) => ({
                chatMessages: state.chatMessages.map((m) =>
                  m.id === assistantMessageId ? { ...m, ragNotes: [...payload.notes] } : m
                ),
              }));
            } else if (payload.subtype === 'EMAIL' && payload.email) {
              set((state) => ({
                chatMessages: state.chatMessages.map((m) =>
                  m.id === assistantMessageId ? { ...m, craftedMail: payload.email } : m
                ),
              }));
            } else if (payload.subtype === 'TOOL_RESULT') {
              const ev: ChatToolEvent = {
                tool: payload.tool,
                label: payload.label,
                summary: payload.summary,
                success: Boolean(payload.success),
              };
              pendingTools.push(ev);
              set((state) => ({
                chatMessages: state.chatMessages.map((m) =>
                  m.id === assistantMessageId ? { ...m, toolEvents: [...pendingTools] } : m
                ),
              }));
              if (payload.notesChanged) {
                onNotesChanged?.();
              }
              if (payload.tokenExpired) {
                get().markMailboxExpired(payload.mailboxEmail);
              }
            } else if (payload.subtype === 'TITLE' && payload.title?.title) {
              const nextTitle = payload.title.title;
              const targetId = payload.chatId || resolvedChatId;
              if (targetId) {
                const nowIso = new Date().toISOString();
                set((state) => ({
                  chats: upsertChatSummary(
                    state.chats,
                    {
                      _id: targetId,
                      session_id: targetId,
                      title: nextTitle,
                      updated_at: nowIso,
                      lastMessageAt: nowIso,
                    },
                    true
                  ),
                }));
              }
            }
          } else if (payload.type === 'RESPONSE' && payload.response) {
            set((state) => ({
              chatStatusMessage: null,
              chatMessages: state.chatMessages.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, content: m.content + payload.response }
                  : m
              ),
            }));
          } else if (payload.type === 'RESPONSE_COMPLETE') {
            if (payload.chatId) {
              resolvedChatId = payload.chatId;
              writeStoredChatId(payload.chatId, user?.email);
              const nowIso = new Date().toISOString();
              set((state) => ({
                activeChatId: payload.chatId,
                chats: upsertChatSummary(
                  state.chats,
                  {
                    _id: payload.chatId,
                    session_id: payload.chatId,
                    ...(payload.title ? { title: payload.title } : {}),
                    updated_at: nowIso,
                    lastMessageAt: nowIso,
                  },
                  true
                ),
              }));
            }
            get().loadChatsList();
          } else if (payload.type === 'ERROR') {
            onToastError?.(payload.error || 'Plum AI error');
          }
        },
      });
    } catch (err: any) {
      const failedMsg = get().chatMessages.find((m) => m.id === assistantMessageId);
      const isEmpty =
        !failedMsg ||
        (!failedMsg.content &&
          !failedMsg.craftedMail &&
          !(failedMsg.toolEvents && failedMsg.toolEvents.length > 0));
      if (isEmpty) {
        const remaining = get().chatMessages.filter(
          (m) => m.id !== assistantMessageId && m.id !== userMessage.id
        );
        const revertNewChat = !currentChatId && remaining.length === 0;
        if (revertNewChat) {
          writeStoredChatId(null, user?.email);
        }
        set((state) => ({
          chatMessages: remaining,
          chatPromptInput: state.chatPromptInput || trimmed,
          ...(revertNewChat
            ? {
                activeChatId: null,
                chats: resolvedChatId
                  ? state.chats.filter((c) => c._id !== resolvedChatId)
                  : state.chats,
              }
            : {}),
        }));
      }
      if (err?.name !== 'AbortError') {
        onToastError?.(err.message || 'Failed to get response from Plum AI');
      }
    } finally {
      activeAbortController = null;
      set({ isChatGenerating: false, chatStatusMessage: null });
      get().loadChatsList();
    }

    return resolvedChatId;
  },

  stopChatGeneration: () => {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
    set({ isChatGenerating: false, chatStatusMessage: null });
  },

  updateChatMessageCraftedMail: (msgId: string, status: string) => {
    set((state) => ({
      chatMessages: state.chatMessages.map((m) =>
        m.id === msgId && m.craftedMail
          ? { ...m, craftedMail: { ...m.craftedMail, status } }
          : m
      ),
    }));
  },

  deleteChatThread: async (id: string) => {
    await api.deleteChat(id);
    if (get().activeChatId === id) {
      get().startNewChat();
    }
    set((state) => ({
      chats: state.chats.filter((c) => c._id !== id),
    }));
    await get().loadChatsList();
  },

  logout: async () => {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
    const email = get().user?.email;
    try {
      await api.logout();
    } catch (e) {}
    try {
      localStorage.removeItem('plum_active_mailbox');
    } catch (e) {}
    writeStoredChatId(null, email);
    set({
      user: null,
      mailboxes: [],
      activeMailbox: '',
      chats: [],
      activeChatId: null,
      chatMessages: [],
      isChatGenerating: false,
      chatStatusMessage: null,
      chatPromptInput: '',
      chatSearchQuery: '',
      chatOpenThoughts: {},
      chatScrollPositions: {},
    });
    window.location.href = '/signin';
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('plum-token-expired', (ev: Event) => {
    const custom = ev as CustomEvent<{ mailboxEmail?: string }>;
    usePlumStore.getState().markMailboxExpired(custom.detail?.mailboxEmail);
  });
}
