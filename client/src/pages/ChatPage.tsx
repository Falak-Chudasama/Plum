import { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import {
  Sparkles,
  ArrowUp,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Mail,
  PenSquare,
  Square,
  Copy,
  Check,
  Search,
  PanelLeft,
  Brain,
  Send,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { usePlumStore } from '../store/usePlumStore';
import { api } from '../lib/api';
import type { ChatSession, ChatToolEvent, ContextNoteItem } from '../lib/api';
import { useToast } from '../components/ui/ToastProvider';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { ContextNotesModal } from '../components/features/ContextNotesModal';
import { playEnter, playScroll, playNotification, playBack } from '../lib/sound';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thought?: string;
  craftedMail?: any;
  toolEvents?: ChatToolEvent[];
  ragNotes?: Array<{ id: string; title: string; content?: string; denseScore?: number; bm25Score?: number }>;
  timestamp?: string;
}

const PROMPT_SUGGESTIONS = [
  {
    title: "Summarize today's mail",
    prompt: "Summarize the important emails I received today",
    icon: Sparkles,
  },
  {
    title: 'Find unread emails',
    prompt: 'Show my unread emails and highlight anything urgent',
    icon: Search,
  },
  {
    title: 'Sync my inbox',
    prompt: 'Sync my latest Gmail emails and categorize them',
    icon: RefreshCw,
  },
  {
    title: 'Draft a follow-up email',
    prompt: 'Draft a concise professional follow-up email',
    icon: PenSquare,
  },
];

export function ChatPage() {
  const { user, activeMailbox, openComposer } = usePlumStore();
  const toast = useToast();

  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const activeChatIdRef = useRef<string | null>(null);

  const setChatId = (id: string | null) => {
    activeChatIdRef.current = id;
    setActiveChatId(id);
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [promptInput, setPromptInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [deleteChatModal, setDeleteChatModal] = useState<ChatSession | null>(null);
  const [openThoughts, setOpenThoughts] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sendingDraftId, setSendingDraftId] = useState<string | null>(null);
  const [savingDraftId, setSavingDraftId] = useState<string | null>(null);

  // Collapsible sleek sidebar (open on large screens, drawer on small)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  // Context Notes
  const [notes, setNotes] = useState<ContextNoteItem[]>([]);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingToolsRef = useRef<ChatToolEvent[]>([]);
  const pendingRagNotesRef = useRef<any[]>([]);
  const pendingDraftRef = useRef<any>(null);

  // Auto-resize composer textarea cleanly
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [promptInput]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, statusMessage]);

  const reloadChats = async () => {
    try {
      const data = await api.getChats();
      setChats(data || []);
    } catch {
      // non-fatal
    }
  };

  useEffect(() => {
    reloadChats();
  }, [activeMailbox, user?.email]);

  const loadNotes = async () => {
    const email = activeMailbox || user?.email;
    if (!email) return;
    try {
      const data = await api.getNotes(email);
      setNotes(data || []);
    } catch {
      // non-fatal
    }
  };

  useEffect(() => {
    loadNotes();
  }, [activeMailbox, user?.email]);

  const activeChatTitle = useMemo(() => {
    if (!activeChatId) return 'New Chat';
    return chats.find((c) => c._id === activeChatId)?.title || 'Chat';
  }, [chats, activeChatId]);

  const loadChat = async (id: string) => {
    playScroll();
    setChatId(id);
    setStatusMessage(null);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
    try {
      const chat = await api.getChatById(id);
      if (!chat) return;

      const loadedMessages: Message[] = [];

      if (Array.isArray(chat.messages) && chat.messages.length > 0) {
        chat.messages.forEach((m: any, idx: number) => {
          loadedMessages.push({
            id: `msg-${idx}-${Date.now()}`,
            role: m.role || 'user',
            content: m.content || '',
            craftedMail: m.craftedMail,
            toolEvents: m.toolEvents,
            ragNotes: m.ragNotes,
            thought: m.thought && m.thought !== '<no_thoughts>' ? m.thought : undefined,
            timestamp: m.created_at,
          });
        });
      } else {
        const prompts = chat.userPrompts || [];
        const responses = chat.responses || [];
        const maxLen = Math.max(prompts.length, responses.length);

        for (let i = 0; i < maxLen; i++) {
          if (prompts[i]) {
            loadedMessages.push({
              id: `prompt-${i}`,
              role: 'user',
              content: prompts[i].prompt,
            });
          }
          if (responses[i]) {
            const resp = responses[i];
            if (resp.response || resp.craftedMail) {
              loadedMessages.push({
                id: `resp-${i}`,
                role: 'assistant',
                content: resp.response || '',
                craftedMail: resp.craftedMail,
                thought: resp.thought && resp.thought !== '<no_thoughts>' ? resp.thought : undefined,
              });
            }
          }
        }
      }

      setMessages(loadedMessages);
    } catch {
      toast.error('Failed to load conversation');
    }
  };

  const startNewChat = () => {
    playEnter();
    setChatId(null);
    setMessages([]);
    setStatusMessage(null);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
    textareaRef.current?.focus();
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : promptInput).trim();
    if (!text || isGenerating) return;

    playEnter();
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const assistantMessageId = `asst-${Date.now()}`;
    pendingToolsRef.current = [];
    pendingRagNotesRef.current = [];
    pendingDraftRef.current = null;

    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      },
    ]);
    setPromptInput('');
    setIsGenerating(true);
    setStatusMessage('Thinking...');

    const currentChatId = activeChatIdRef.current ?? activeChatId;

    try {
      abortControllerRef.current = new AbortController();

      await api.streamPlumChat({
        prompt: text,
        chatId: currentChatId,
        mailboxEmail: activeMailbox || user?.email,
        email: user?.email,
        signal: abortControllerRef.current.signal,
        onEvent: (payload) => {
          if (payload.type === 'INFO') {
            setStatusMessage(payload.showMessage || payload.message || 'Working...');
          } else if (payload.type === 'SYSTEM') {
            if (payload.subtype === 'RAG_CONTEXT' && Array.isArray(payload.notes)) {
              pendingRagNotesRef.current = payload.notes;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId ? { ...m, ragNotes: [...payload.notes] } : m
                )
              );
            } else if (payload.subtype === 'EMAIL' && payload.email) {
              pendingDraftRef.current = payload.email;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId ? { ...m, craftedMail: payload.email } : m
                )
              );
            } else if (payload.subtype === 'TOOL_RESULT') {
              const ev: ChatToolEvent = {
                tool: payload.tool,
                label: payload.label,
                summary: payload.summary,
                success: Boolean(payload.success),
              };
              pendingToolsRef.current = [...pendingToolsRef.current, ev];
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, toolEvents: [...pendingToolsRef.current] }
                    : m
                )
              );
              if (payload.notesChanged) {
                loadNotes();
              }
            } else if (payload.subtype === 'TITLE' && payload.title?.title) {
              reloadChats();
            }
          } else if (payload.type === 'RESPONSE' && payload.response) {
            setStatusMessage(null);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, content: m.content + payload.response }
                  : m
              )
            );
          } else if (payload.type === 'RESPONSE_COMPLETE') {
            if (payload.chatId) {
              setChatId(payload.chatId);
            }
            reloadChats();
          } else if (payload.type === 'ERROR') {
            toast.error(payload.error || 'Plum AI error');
          }
        },
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error(err.message || 'Failed to get response from Plum AI');
      }
    } finally {
      setIsGenerating(false);
      setStatusMessage(null);
      reloadChats();
    }
  };

  const stopGeneration = () => {
    playBack();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setStatusMessage(null);
  };

  const handleDirectSendDraft = async (msgId: string, mail: any) => {
    const recipients = Array.isArray(mail.to)
      ? mail.to
      : String(mail.to || '')
          .split(/[,;\s]+/)
          .filter((e) => e.includes('@'));

    if (!recipients.length) {
      openComposer({
        to: [],
        subject: mail.subject,
        body: mail.body,
      });
      toast.info('Add a recipient in Composer to send');
      return;
    }

    setSendingDraftId(msgId);
    playEnter();
    try {
      await api.sendEmail(
        {
          from: activeMailbox || mail.from,
          to: recipients,
          cc: mail.cc || [],
          bcc: mail.bcc || [],
          subject: mail.subject || 'No Subject',
          body: mail.body || '',
          category: Array.isArray(mail.category) ? mail.category[0] : mail.category || 'Other',
          status: 'sent',
        },
        activeMailbox || mail.from
      );
      toast.success(`Email sent to ${recipients[0]}`);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.craftedMail
            ? { ...m, craftedMail: { ...m.craftedMail, status: 'sent' } }
            : m
        )
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err.message || 'Failed to send email');
    } finally {
      setSendingDraftId(null);
    }
  };

  const handleDirectSaveDraft = async (msgId: string, mail: any) => {
    setSavingDraftId(msgId);
    playEnter();
    try {
      await api.saveDraft(
        {
          from: activeMailbox || mail.from,
          to: Array.isArray(mail.to) ? mail.to : [mail.to].filter(Boolean),
          subject: mail.subject || 'Untitled Draft',
          body: mail.body || '',
          category: Array.isArray(mail.category) ? mail.category[0] : mail.category || 'Other',
          status: 'draft',
        },
        activeMailbox || mail.from
      );
      toast.success('Saved to Drafts');
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.craftedMail
            ? { ...m, craftedMail: { ...m.craftedMail, status: 'draft' } }
            : m
        )
      );
    } catch {
      toast.error('Failed to save draft');
    } finally {
      setSavingDraftId(null);
    }
  };

  const confirmDeleteChat = async () => {
    if (!deleteChatModal) return;
    try {
      await api.deleteChat(deleteChatModal._id);
      toast.success('Deleted');
      if (activeChatIdRef.current === deleteChatModal._id || activeChatId === deleteChatModal._id) {
        startNewChat();
      }
      setDeleteChatModal(null);
      reloadChats();
    } catch {
      toast.error('Failed to delete chat');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    playNotification();
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const groupedChats = useMemo(() => {
    const filtered = chats.filter((c) =>
      c.title.toLowerCase().includes(chatSearchQuery.toLowerCase())
    );

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 7 * 86400000;

    const groups: { [key: string]: ChatSession[] } = {
      Today: [],
      Yesterday: [],
      '7 Days': [],
      Older: [],
    };

    filtered.forEach((chat) => {
      const dateStr = chat.updated_at || chat.created_at || chat.updatedAt || chat.createdAt;
      const parsedTime = dateStr ? new Date(dateStr).getTime() : Date.now();
      const chatTime = Number.isNaN(parsedTime) ? Date.now() : parsedTime;
      if (chatTime >= todayStart) groups.Today.push(chat);
      else if (chatTime >= yesterdayStart) groups.Yesterday.push(chat);
      else if (chatTime >= weekStart) groups['7 Days'].push(chat);
      else groups.Older.push(chat);
    });

    return groups;
  }, [chats, chatSearchQuery]);

  const activeMailboxShort = (activeMailbox || user?.email || '').split('@')[0];

  const SidebarContent = (
    <div className="flex h-full flex-col">
      {/* Top Action */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={startNewChat}
            className="focus-ring btn-interactive flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 py-2 px-3 text-xs font-semibold shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playBack();
              setIsSidebarOpen(false);
            }}
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
          <input
            type="text"
            value={chatSearchQuery}
            onChange={(e) => setChatSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white/60 dark:bg-stone-900/50 pl-8 pr-7 py-1.5 text-xs text-stone-800 dark:text-stone-200 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#B266E6]"
          />
          {chatSearchQuery && (
            <button
              type="button"
              onClick={() => setChatSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-4 scrollbar-clean">
        {chats.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-stone-400">
            No conversations yet
          </div>
        ) : (
          Object.entries(groupedChats).map(([groupTitle, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={groupTitle} className="space-y-0.5">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                  {groupTitle}
                </div>
                {items.map((c) => {
                  const isActive = c._id === activeChatId;
                  return (
                    <div
                      key={c._id}
                      className={`group flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition ${
                        isActive
                          ? 'bg-[#B266E6]/12 text-[#7E36B2] dark:text-[#DBBFFF] font-semibold'
                          : 'text-stone-600 dark:text-stone-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => loadChat(c._id)}
                        className="flex-1 text-left truncate py-0.5"
                      >
                        {c.title}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playBack();
                          setDeleteChatModal(c);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-stone-400 hover:text-rose-500 transition"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Notes Trigger */}
      <div className="p-2.5 border-t border-black/[0.05] dark:border-white/[0.06]">
        <button
          type="button"
          onClick={() => {
            playEnter();
            setIsNotesModalOpen(true);
          }}
          className="focus-ring btn-interactive w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
        >
          <span className="flex items-center gap-2">
            <Brain className="h-3.5 w-3.5 text-[#7E36B2] dark:text-[#DBBFFF]" />
            <span>Context Notes</span>
          </span>
          {notes.length > 0 && (
            <span className="rounded-full bg-[#B266E6]/12 text-[#7E36B2] dark:text-[#DBBFFF] px-1.5 py-0.5 text-[10px] font-bold">
              {notes.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] pt-14 sm:pt-[72px] pb-16 sm:pb-0 flex overflow-hidden font-sans antialiased">
      {/* Desktop Docked Collapsible Sidebar */}
      {isSidebarOpen && (
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-black/[0.06] dark:border-white/[0.08] bg-white/35 dark:bg-[#141512]/55 backdrop-blur-md">
          {SidebarContent}
        </aside>
      )}

      {/* Mobile / Tablet Slide-over Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-stone-900/40 dark:bg-black/60 backdrop-blur-xs animate-fade-in"
            onClick={() => {
              playBack();
              setIsSidebarOpen(false);
            }}
          />
          <aside className="relative z-10 w-72 max-w-[82vw] h-full glass-panel bg-white/95 dark:bg-[#181915]/95 border-r border-black/[0.08] dark:border-white/[0.1] animate-slide-from-left">
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Center Conversation Canvas */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Minimal Workspace Top Strip */}
        <div className="h-11 shrink-0 px-4 flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.06]">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => {
                playScroll();
                setIsSidebarOpen((prev) => !prev);
              }}
              className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition"
              title="Toggle sidebar"
              aria-label="Toggle sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>

            {!isSidebarOpen && (
              <button
                type="button"
                onClick={startNewChat}
                className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition"
                title="New chat"
                aria-label="New chat"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}

            <span className="text-xs font-medium text-stone-500 dark:text-stone-400 truncate">
              {activeChatTitle}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                playEnter();
                setIsNotesModalOpen(true);
              }}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-stone-600 dark:text-stone-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
              title="Context Notes"
            >
              <Brain className="h-3.5 w-3.5 text-[#7E36B2] dark:text-[#DBBFFF]" />
              <span className="hidden sm:inline">Notes</span>
              {notes.length > 0 && (
                <span className="text-[10px] text-[#7E36B2] dark:text-[#DBBFFF] font-bold">
                  {notes.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Message Stream */}
        <div className="flex-1 overflow-y-auto scrollbar-clean">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 h-full">
            {messages.length === 0 ? (
              <div className="min-h-full flex flex-col items-center justify-center py-8 text-center animate-fade-in">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#B266E6]/12 text-[#7E36B2] dark:text-[#DBBFFF] mb-4">
                  <Sparkles className="h-5 w-5" />
                </div>

                <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-white">
                  How can I help?
                </h1>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg mt-6">
                  {PROMPT_SUGGESTIONS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() => {
                          playScroll();
                          handleSendMessage(item.prompt);
                        }}
                        className="focus-ring row-interactive group flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl glass-card border border-black/[0.06] dark:border-white/[0.08] hover:border-stone-300 dark:hover:border-stone-700 text-left"
                      >
                        <Icon className="h-4 w-4 text-stone-400 group-hover:text-[#7E36B2] dark:group-hover:text-[#DBBFFF] shrink-0 transition-colors" />
                        <span className="text-xs font-semibold text-stone-700 dark:text-stone-200 truncate">
                          {item.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-6 space-y-6">
                {messages.map((msg, index) => {
                  if (msg.role === 'user') {
                    return (
                      <div key={msg.id || index} className="flex justify-end animate-fade-in">
                        <div className="rounded-2xl rounded-br-xs bg-[#7E36B2] text-white px-4 py-2.5 text-sm leading-relaxed max-w-[82%] shadow-2xs">
                          {msg.content}
                        </div>
                      </div>
                    );
                  }

                  const isLastAssistant = index === messages.length - 1;
                  const showStreamingCursor = isGenerating && isLastAssistant && !msg.content && !msg.craftedMail;

                  return (
                    <div key={msg.id || index} className="group flex items-start gap-3 animate-fade-in">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#B266E6]/12 text-[#7E36B2] dark:text-[#DBBFFF] shrink-0 mt-0.5">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>

                      <div className="flex-1 min-w-0 space-y-2.5">
                        {/* Compact Tool & Memory Chips */}
                        {((msg.toolEvents && msg.toolEvents.length > 0) ||
                          (msg.ragNotes && msg.ragNotes.length > 0)) && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {msg.toolEvents?.map((ev, tIdx) => (
                              <span
                                key={`${ev.tool}-${tIdx}`}
                                title={ev.summary}
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                                  ev.success
                                    ? 'bg-black/[0.03] dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.08] text-stone-600 dark:text-stone-300'
                                    : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {ev.success ? (
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                                ) : (
                                  <AlertCircle className="h-3 w-3 text-rose-500 shrink-0" />
                                )}
                                <span>{ev.label}</span>
                              </span>
                            ))}

                            {msg.ragNotes && msg.ragNotes.length > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#B266E6]/10 border border-[#B266E6]/20 px-2.5 py-0.5 text-[11px] font-medium text-[#7E36B2] dark:text-[#DBBFFF]">
                                <Brain className="h-3 w-3 shrink-0" />
                                <span>{msg.ragNotes.map((n) => n.title).join(', ')}</span>
                              </span>
                            )}
                          </div>
                        )}

                        {/* Collapsible Thought */}
                        {msg.thought && (
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                setOpenThoughts((prev) => ({
                                  ...prev,
                                  [msg.id]: !prev[msg.id],
                                }))
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition"
                            >
                              {openThoughts[msg.id] ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                              <span>Reasoning</span>
                            </button>
                            {openThoughts[msg.id] && (
                              <div className="mt-1.5 pl-3 border-l-2 border-black/[0.08] dark:border-white/[0.1] text-xs text-stone-500 dark:text-stone-400 font-mono whitespace-pre-wrap">
                                {msg.thought}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Live Status Indicator */}
                        {showStreamingCursor && statusMessage && (
                          <div className="flex items-center gap-2 text-xs font-medium text-stone-500 dark:text-stone-400">
                            <span className="h-2 w-2 rounded-full bg-[#B266E6] animate-pulse" />
                            <span>{statusMessage}</span>
                          </div>
                        )}

                        {/* Open Editorial Markdown Response */}
                        {msg.content && (
                          <div className="markdown-body text-sm leading-relaxed text-stone-800 dark:text-stone-100">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkBreaks]}
                              components={{
                                h1: ({ node, ...props }) => (
                                  <h1 className="text-lg font-bold text-stone-900 dark:text-white mt-4 mb-2 first:mt-0 tracking-tight" {...props} />
                                ),
                                h2: ({ node, ...props }) => (
                                  <h2 className="text-base font-bold text-stone-900 dark:text-white mt-3.5 mb-1.5 first:mt-0 tracking-tight" {...props} />
                                ),
                                h3: ({ node, ...props }) => (
                                  <h3 className="text-sm font-bold text-stone-900 dark:text-white mt-3 mb-1 first:mt-0" {...props} />
                                ),
                                p: ({ node, ...props }) => (
                                  <p className="my-2 leading-relaxed first:mt-0 last:mb-0" {...props} />
                                ),
                                ul: ({ node, ...props }) => (
                                  <ul className="list-disc pl-5 my-2 space-y-1 marker:text-[#B266E6]" {...props} />
                                ),
                                ol: ({ node, ...props }) => (
                                  <ol className="list-decimal pl-5 my-2 space-y-1 marker:text-[#B266E6] marker:font-semibold" {...props} />
                                ),
                                blockquote: ({ node, ...props }) => (
                                  <blockquote className="border-l-2 border-[#B266E6] pl-3 py-0.5 my-2 text-stone-600 dark:text-stone-400 italic" {...props} />
                                ),
                                code: ({ node, inline, className, children, ...props }: any) => {
                                  const match = /language-(\w+)/.exec(className || '');
                                  const codeString = String(children).replace(/\n$/, '');
                                  if (!inline && (match || codeString.includes('\n'))) {
                                    return (
                                      <div className="my-3 rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.1] bg-stone-900 text-stone-100 text-xs font-mono">
                                        <div className="flex items-center justify-between px-3 py-1.5 bg-stone-950/60 border-b border-white/[0.06] text-[10px] text-stone-400">
                                          <span className="uppercase tracking-wider">{match?.[1] || 'code'}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              navigator.clipboard.writeText(codeString);
                                              playNotification();
                                            }}
                                            className="hover:text-white transition flex items-center gap-1"
                                          >
                                            <Copy className="h-3 w-3" />
                                            <span>Copy</span>
                                          </button>
                                        </div>
                                        <pre className="p-3 overflow-x-auto scrollbar-clean">
                                          <code>{children}</code>
                                        </pre>
                                      </div>
                                    );
                                  }
                                  return (
                                    <code className="rounded-md bg-black/[0.05] dark:bg-white/[0.08] px-1.5 py-0.5 text-xs font-mono text-[#7E36B2] dark:text-[#DBBFFF]" {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        )}

                        {/* Interactive Email Draft Execution Card */}
                        {msg.craftedMail && (
                          <div className="glass-card rounded-2xl border border-black/[0.08] dark:border-white/[0.1] p-4 space-y-3 mt-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-stone-900 dark:text-white truncate">
                                {msg.craftedMail.subject || 'Draft'}
                              </span>
                              <span className="rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 shrink-0">
                                {msg.craftedMail.status === 'sent'
                                  ? 'Sent'
                                  : msg.craftedMail.status === 'draft'
                                  ? 'Saved'
                                  : 'Draft'}
                              </span>
                            </div>

                            {msg.craftedMail.to?.length > 0 && (
                              <div className="text-xs text-stone-500 dark:text-stone-400 truncate">
                                To: <span className="font-medium text-stone-800 dark:text-stone-200">{Array.isArray(msg.craftedMail.to) ? msg.craftedMail.to.join(', ') : msg.craftedMail.to}</span>
                              </div>
                            )}

                            <div className="rounded-xl bg-black/[0.025] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] p-3 text-xs text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto scrollbar-clean">
                              {msg.craftedMail.body}
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2 pt-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  playEnter();
                                  openComposer({
                                    to: Array.isArray(msg.craftedMail.to)
                                      ? msg.craftedMail.to
                                      : [msg.craftedMail.to].filter(Boolean),
                                    subject: msg.craftedMail.subject,
                                    body: msg.craftedMail.body,
                                  });
                                }}
                                className="focus-ring btn-interactive inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]"
                              >
                                <PenSquare className="h-3.5 w-3.5" />
                                <span>Edit</span>
                              </button>

                              {msg.craftedMail.status !== 'sent' && (
                                <>
                                  <button
                                    type="button"
                                    disabled={savingDraftId === msg.id}
                                    onClick={() => handleDirectSaveDraft(msg.id, msg.craftedMail)}
                                    className="focus-ring btn-glass-secondary !py-1.5 !px-3 !text-xs"
                                  >
                                    <Save className="h-3.5 w-3.5" />
                                    <span>{msg.craftedMail.status === 'draft' ? 'Saved' : 'Save Draft'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={sendingDraftId === msg.id}
                                    onClick={() => handleDirectSendDraft(msg.id, msg.craftedMail)}
                                    className="focus-ring btn-glass-primary !py-1.5 !px-3.5 !text-xs"
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                    <span>{sendingDraftId === msg.id ? 'Sending...' : 'Send'}</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Hover Copy Action */}
                        {msg.content && !(isGenerating && isLastAssistant) && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity pt-0.5">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(msg.content, msg.id)}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
                              title="Copy"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-500" />
                                  <span className="text-emerald-500">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isGenerating && statusMessage && messages[messages.length - 1]?.content !== '' && (
                  <div className="flex items-center gap-2 pl-9 text-xs text-stone-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#B266E6] animate-pulse" />
                    <span>{statusMessage}</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Minimal Floating Composer Dock */}
        <div className="shrink-0 px-4 pb-3 sm:pb-5 pt-2 bg-gradient-to-t from-[#F8F9F5] via-[#F8F9F5]/80 to-transparent dark:from-[#121310] dark:via-[#121310]/80">
          <div className="max-w-2xl mx-auto">
            <div className="glass-panel rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-white/80 dark:bg-[#181915]/85 px-3.5 py-2.5 shadow-floating flex flex-col gap-1.5">
              <textarea
                ref={textareaRef}
                rows={1}
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Message Plum..."
                className="w-full resize-none border-0 bg-transparent text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none leading-relaxed max-h-40 overflow-y-auto scrollbar-clean"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-stone-400 dark:text-stone-500 min-w-0">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate font-mono">{activeMailboxShort || 'mailbox'}</span>
                </div>

                {isGenerating ? (
                  <button
                    type="button"
                    onClick={stopGeneration}
                    className="focus-ring btn-interactive inline-flex h-8 items-center gap-1.5 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-3 text-xs font-semibold"
                    title="Stop generating"
                  >
                    <Square className="h-3 w-3 fill-current" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!promptInput.trim()}
                    aria-label="Send message"
                    className="focus-ring btn-interactive flex h-8 w-8 items-center justify-center rounded-full bg-[#7E36B2] dark:bg-[#DBBFFF] text-white dark:text-[#121310] disabled:opacity-35 disabled:cursor-not-allowed shadow-xs"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ContextNotesModal
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        notes={notes}
        userEmail={activeMailbox || user?.email}
        onNotesChanged={loadNotes}
      />

      <ConfirmationModal
        isOpen={Boolean(deleteChatModal)}
        onClose={() => setDeleteChatModal(null)}
        onConfirm={confirmDeleteChat}
        title="Delete Conversation"
        isDestructive
        description={
          <span>
            Delete <strong className="text-stone-900 dark:text-white">"{deleteChatModal?.title}"</strong>?
          </span>
        }
      />
    </div>
  );
}
