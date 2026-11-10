import { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Database,
  Mail,
  PenSquare,
  StopCircle,
  Copy,
  Check,
  Bot,
  MessageSquare,
  Search,
  X,
  PanelLeft,
  Brain,
  Zap,
  BookOpen,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { usePlumStore } from '../store/usePlumStore';
import { api } from '../lib/api';
import type { ChatSession, ContextNoteItem } from '../lib/api';
import { useToast } from '../components/ui/ToastProvider';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { ContextNotesModal } from '../components/features/ContextNotesModal';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thought?: string;
  craftedMail?: any;
  query?: any;
  ragNotes?: Array<{ id: string; title: string; content?: string; denseScore?: number; bm25Score?: number }>;
  timestamp?: string;
}

const PROMPT_SUGGESTIONS = [
  {
    title: 'Show emails from professors',
    prompt: 'Show emails from my professors or academic advisors received recently',
    icon: Mail,
  },
  {
    title: 'Draft deadline extension',
    prompt: 'Draft a polite and formal email requesting a 3-day deadline extension for my coursework',
    icon: PenSquare,
  },
  {
    title: 'Find unread notices',
    prompt: 'Find all unread emails and announcements from this week',
    icon: Search,
  },
  {
    title: 'Summarize today’s mail',
    prompt: 'Summarize the most important emails and key notices I received today',
    icon: Sparkles,
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

  // Collapsible Menu state (defaults to closed on root canvas so chat is completely unboxed)
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  // Context Notes (Hybrid RAG) state
  const [notes, setNotes] = useState<ContextNoteItem[]>([]);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [activeRagNotes, setActiveRagNotes] = useState<any[]>([]);

  const socketRef = useRef<WebSocket | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [promptInput]);

  // Load chat sessions for active user
  const reloadChats = async () => {
    const emailToQuery = activeMailbox || user?.email;
    if (!emailToQuery) return;
    try {
      const list = await api.getChatList(emailToQuery);
      if (Array.isArray(list)) {
        setChats(list);
      }
    } catch (err) {
      console.warn('Could not load chat sessions list:', err);
    }
  };

  const loadNotes = async () => {
    const emailToQuery = activeMailbox || user?.email;
    if (!emailToQuery) return;
    try {
      const list = await api.getNotes(emailToQuery);
      if (Array.isArray(list)) {
        setNotes(list);
      }
    } catch (err) {
      console.warn('Could not load context notes:', err);
    }
  };

  useEffect(() => {
    reloadChats();
    loadNotes();
  }, [user?.email, activeMailbox]);

  // Connect WebSocket gracefully in background
  useEffect(() => {
    let ws: WebSocket | null = null;
    let isCleanedUp = false;

    try {
      const isSecure = window.location.protocol === 'https:';
      const wsUrl = isSecure
        ? `wss://${window.location.host}/ws`
        : `ws://${window.location.hostname}:4065`;

      ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onmessage = (event) => {
        if (isCleanedUp) return;
        try {
          const data = JSON.parse(event.data);
          handleStreamPayload(data);
        } catch (err) {
          console.warn('Failed to parse incoming socket payload:', err);
        }
      };

      ws.onerror = () => {
        // Silently allow fallback to HTTP SSE streaming
      };
    } catch (_) {
      // Silently allow fallback
    }

    return () => {
      isCleanedUp = true;
      if (ws) {
        try {
          ws.close();
        } catch (_) {}
      }
    };
  }, [user?.email]);

  // Common dispatcher for payload chunks (WebSocket OR HTTP SSE Stream)
  const handleStreamPayload = (data: any) => {
    if (data.type === 'RESPONSE') {
      if (data.message === '\n<RESPONSE_ENDED>') {
        setIsGenerating(false);
        setStatusMessage(null);
        return;
      }
      setIsGenerating(true);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant' && !last.id.includes('complete')) {
          return [
            ...prev.slice(0, -1),
            { ...last, content: (last.content || '') + (data.response || '') },
          ];
        } else {
          return [
            ...prev,
            {
              id: `stream-${Date.now()}`,
              role: 'assistant',
              content: data.response || '',
              ragNotes: activeRagNotes.length > 0 ? [...activeRagNotes] : undefined,
            },
          ];
        }
      });
    } else if (data.type === 'RESPONSE_COMPLETE') {
      setIsGenerating(false);
      setStatusMessage(null);
      setActiveRagNotes([]);
      if (data.chatId) {
        setChatId(data.chatId);
        reloadChats();
      }
    } else if (data.type === 'SYSTEM') {
      if (data.subtype === 'RAG_CONTEXT' && Array.isArray(data.notes)) {
        setActiveRagNotes(data.notes);
      } else if (data.subtype === 'EMAIL' || data.subtype === 'CRAFTED_MAIL') {
        setMessages((prev) => [
          ...prev,
          {
            id: `crafted-${Date.now()}`,
            role: 'system',
            content: '',
            craftedMail: data.email || data.mail,
          },
        ]);
      } else if (data.subtype === 'QUERY') {
        setMessages((prev) => [
          ...prev,
          {
            id: `query-${Date.now()}`,
            role: 'system',
            content: '',
            query: {
              query: data.query,
              result: data.result,
              resultCount: data.resultCount,
              isSuccess: data.isSuccess,
            },
          },
        ]);
      } else if (data.subtype === 'TITLE' && data.title?.title) {
        reloadChats();
      }
    } else if (data.type === 'INFO') {
      setStatusMessage(data.showMessage || data.message || null);
    } else if (data.type === 'ERROR') {
      setIsGenerating(false);
      setStatusMessage(null);
      toast.error(data.error || 'Chat generation error');
    }
  };

  const loadChat = async (id: string) => {
    setChatId(id);
    setStatusMessage(null);
    setIsMenuOpen(false); // Close mobile/drawer menu on selection
    try {
      const chat = await api.getChatById(id);
      if (!chat) return;

      const loadedMessages: Message[] = [];
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
          if (resp.craftedMail) {
            loadedMessages.push({
              id: `crafted-${i}`,
              role: 'system',
              content: '',
              craftedMail: resp.craftedMail,
            });
          }
          if (resp.query) {
            loadedMessages.push({
              id: `query-${i}`,
              role: 'system',
              content: '',
              query: resp.query,
            });
          }
          if (resp.response) {
            loadedMessages.push({
              id: `resp-${i}`,
              role: 'assistant',
              content: resp.response,
              thought: resp.thought && resp.thought !== '<no_thoughts>' ? resp.thought : undefined,
            });
          }
        }
      }

      setMessages(loadedMessages);

      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'COMMAND',
            command: `NEW_CHAT_CLICKED:${id}`,
          })
        );
      }
    } catch (err) {
      console.warn('Error loading chat session:', err);
    }
  };

  const startNewChat = () => {
    setChatId(null);
    setMessages([]);
    setStatusMessage(null);
    setIsMenuOpen(false);
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'COMMAND',
          command: 'CLEAR_CONTEXT',
        })
      );
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : promptInput).trim();
    if (!text || isGenerating) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setPromptInput('');
    setIsGenerating(true);
    setStatusMessage('Thinking with Basket AI...');

    const chatCount = messages.filter((m) => m.role === 'user').length;
    const effectiveEmail = activeMailbox || user?.email;
    const currentChatId = activeChatIdRef.current ?? activeChatId;

    // Strategy 1: WebSocket if open
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'PROMPT',
          prompt: text,
          email: effectiveEmail,
          chatId: currentChatId,
          chatCount,
        })
      );
      return;
    }

    // Strategy 2: HTTP SSE Streaming via api.streamChatPrompt
    try {
      abortControllerRef.current = new AbortController();
      await api.streamChatPrompt({
        prompt: text,
        chatId: currentChatId,
        chatCount,
        email: effectiveEmail,
        onMessage: handleStreamPayload,
        signal: abortControllerRef.current.signal,
      });
      setIsGenerating(false);
      setStatusMessage(null);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error(err.message || 'Failed to generate response with Basket AI');
      }
      setIsGenerating(false);
      setStatusMessage(null);
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'COMMAND',
          command: 'STOP_RESPONSE',
        })
      );
    }
    setIsGenerating(false);
    setStatusMessage(null);
  };

  const confirmDeleteChat = async () => {
    if (!deleteChatModal) return;
    try {
      await api.deleteChat(deleteChatModal._id);
      toast.success('Conversation deleted');
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
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Group chat sessions chronologically
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
      'Previous 7 Days': [],
      Older: [],
    };

    filtered.forEach((chat) => {
      const chatTime = new Date(chat.createdAt || chat.updatedAt).getTime();
      if (chatTime >= todayStart) {
        groups.Today.push(chat);
      } else if (chatTime >= yesterdayStart) {
        groups.Yesterday.push(chat);
      } else if (chatTime >= weekStart) {
        groups['Previous 7 Days'].push(chat);
      } else {
        groups.Older.push(chat);
      }
    });

    return groups;
  }, [chats, chatSearchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9F5] dark:bg-[#121310] relative text-stone-900 dark:text-[#F3F4F1] font-sans antialiased">
      {/* Top Floating App Header */}
      <Header />

      {/* ============================================================== */}
      {/* FLOATING STATIONARY CONTROLS (Always fixed in place on screen) */}
      {/* ============================================================== */}
      <div className="fixed top-20 left-4 sm:left-6 z-40 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className={`focus-ring inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-bold shadow-lift backdrop-blur-2xl transition-all active:scale-95 ${
            isMenuOpen
              ? 'bg-[#B266E6] text-white border-[#B266E6]'
              : 'border-black/[0.08] dark:border-white/[0.1] bg-white/90 dark:bg-[#181915]/90 text-stone-800 dark:text-stone-200 hover:border-[#B266E6]/40 hover:bg-white dark:hover:bg-[#181915]'
          }`}
          title="Toggle Conversations History"
        >
          <PanelLeft className={`h-4 w-4 ${isMenuOpen ? 'text-white' : 'text-[#B266E6]'}`} />
          <span>Conversations</span>
          {chats.length > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                isMenuOpen
                  ? 'bg-white/20 text-white'
                  : 'bg-[#B266E6]/15 text-[#5C207E] dark:text-[#DBBFFF]'
              }`}
            >
              {chats.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={startNewChat}
          className="focus-ring inline-flex items-center gap-1.5 rounded-2xl bg-[#B266E6] hover:bg-[#8F40C7] text-white px-3.5 py-2 text-xs font-bold shadow-lift transition active:scale-95"
          title="Start New Conversation"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New Chat</span>
        </button>

        <button
          type="button"
          onClick={() => setIsNotesModalOpen(true)}
          className="focus-ring inline-flex items-center gap-1.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-white/90 dark:bg-[#181915]/90 hover:border-[#B266E6]/40 text-stone-800 dark:text-stone-200 px-3.5 py-2 text-xs font-bold shadow-lift backdrop-blur-2xl transition active:scale-95"
          title="Context Notes (Hybrid Vector + BM25 RAG Memory)"
        >
          <Brain className="h-3.5 w-3.5 text-[#B266E6]" />
          <span>Notes</span>
          {notes.length > 0 && (
            <span className="rounded-full bg-[#B266E6]/15 text-[#5C207E] dark:text-[#DBBFFF] px-1.5 py-0.5 text-[10px] font-bold">
              {notes.length}
            </span>
          )}
        </button>
      </div>

      {/* ============================================================== */}
      {/* FLOATING CONVERSATIONS WINDOW (Anchored, scroll-independent)   */}
      {/* ============================================================== */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop Click-Away */}
          <div
            className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Floating Window Container */}
          <div className="fixed top-32 left-4 sm:left-6 z-50 w-80 sm:w-88 max-w-[calc(100vw-2rem)] h-[calc(100vh-10rem)] max-h-[640px] rounded-3xl border border-black/[0.08] dark:border-white/[0.1] bg-white/95 dark:bg-[#181915]/95 backdrop-blur-2xl shadow-lift flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Window Header */}
            <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between bg-stone-50/60 dark:bg-stone-900/40">
              <div className="flex items-center gap-2 font-bold text-sm text-stone-900 dark:text-white">
                <MessageSquare className="h-4 w-4 text-[#B266E6]" />
                <span>Conversations</span>
                <span className="rounded-full bg-[#B266E6]/10 text-[#5C207E] dark:text-[#DBBFFF] text-[10px] px-2 py-0.5 font-bold">
                  {chats.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Actions: New Chat & Search Filter */}
            <div className="p-3.5 space-y-2.5 border-b border-black/[0.05] dark:border-white/[0.06]">
              <button
                type="button"
                onClick={startNewChat}
                className="focus-ring w-full flex items-center justify-center gap-2 rounded-2xl bg-[#B266E6] hover:bg-[#8F40C7] text-white py-2 px-4 text-xs font-bold shadow-soft transition active:scale-98"
              >
                <Plus className="h-4 w-4" />
                <span>New Conversation</span>
              </button>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                <input
                  type="text"
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-stone-900/80 pl-8 pr-3 py-1.5 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#B266E6]"
                />
              </div>
            </div>

            {/* Scrollable Conversation List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-clean">
              {Object.entries(groupedChats).map(([groupTitle, chatItems]) => {
                if (chatItems.length === 0) return null;
                return (
                  <div key={groupTitle} className="space-y-1">
                    <span className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                      {groupTitle}
                    </span>
                    <div className="space-y-0.5">
                      {chatItems.map((c) => {
                        const isActive = c._id === activeChatId;
                        return (
                          <div
                            key={c._id}
                            className={`group relative flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition cursor-pointer ${
                              isActive
                                ? 'bg-[#B266E6]/10 text-[#5C207E] dark:text-[#DBBFFF] font-bold border-l-2 border-[#B266E6]'
                                : 'text-stone-700 dark:text-stone-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                            }`}
                            onClick={() => loadChat(c._id)}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-6">
                              <MessageSquare
                                className={`h-3.5 w-3.5 shrink-0 ${
                                  isActive ? 'text-[#B266E6]' : 'text-stone-400'
                                }`}
                              />
                              <span className="truncate">{c.title || 'Conversation'}</span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteChatModal(c);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition p-1 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                              title="Delete Conversation"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {chats.length === 0 && (
                <div className="p-6 text-center text-xs text-stone-400 space-y-1">
                  <MessageSquare className="h-5 w-5 mx-auto text-stone-300 dark:text-stone-600 mb-2" />
                  <p>No past conversations yet.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-black/[0.05] dark:border-white/[0.06] text-[11px] text-stone-500 flex items-center gap-2 bg-stone-50/40 dark:bg-stone-900/30">
              <Mail className="h-3.5 w-3.5 text-[#B266E6] shrink-0" />
              <span className="truncate">
                Mailbox:{' '}
                <strong className="font-semibold text-stone-700 dark:text-stone-300">
                  {activeMailbox || user?.email}
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ROOT MAIN CHAT CANVAS (NO CONTAINERS, FLOATS DIRECTLY ON PAGE) */}
      {/* ============================================================== */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-32 pb-44 space-y-6">
        {messages.length === 0 ? (
          /* Empty State Hero floating directly on the page background */
          <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center space-y-6 pt-8 pb-16 animate-in fade-in duration-300">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-[#B266E6]/25 via-[#DBBFFF]/20 to-[#89D66D]/20 text-[#5C207E] dark:text-[#DBBFFF] shadow-lift">
                <Sparkles className="h-8 w-8 text-[#B266E6]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-white">
                How can Plum assist you today?
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-md">
                Search your correspondence, draft professional emails, or check academic notices with Basket AI.
              </p>
            </div>

            {/* Prompt Suggestion Cards floating directly on canvas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left pt-2">
              {PROMPT_SUGGESTIONS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => handleSendMessage(item.prompt)}
                    className="group flex flex-col justify-between p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-[#181915]/70 hover:bg-white dark:hover:bg-[#181915] hover:border-[#B266E6]/40 transition-all shadow-soft text-left"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-stone-900 dark:text-white group-hover:text-[#5C207E] dark:group-hover:text-[#DBBFFF] transition">
                        {item.title}
                      </span>
                      <Icon className="h-4 w-4 text-stone-400 group-hover:text-[#B266E6] transition" />
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2">
                      "{item.prompt}"
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Message Thread floating directly on canvas */
          <div className="space-y-6">
            {messages.map((msg, index) => {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id || index} className="flex justify-end animate-in fade-in duration-150">
                    <div className="bg-[#B266E6] text-white rounded-3xl rounded-tr-xs px-5 py-3 text-xs sm:text-sm shadow-soft max-w-[85%] sm:max-w-[75%] leading-relaxed font-medium">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              if (msg.role === 'system' && msg.craftedMail) {
                const mail = msg.craftedMail;
                return (
                  <div key={msg.id || index} className="flex items-start gap-3 animate-in fade-in duration-200">
                    <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#B266E6]/15 text-[#5C207E] dark:text-[#DBBFFF] shrink-0 mt-1 shadow-2xs">
                      <PenSquare className="h-4 w-4 text-[#B266E6]" />
                    </div>
                    <div className="w-full max-w-[85%] rounded-3xl rounded-tl-xs border border-[#B266E6]/30 bg-white dark:bg-[#181915] p-5 shadow-soft space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C207E] dark:text-[#DBBFFF]">
                          Email Draft Prepared
                        </span>
                        <span className="text-[10px] text-stone-400 font-semibold">Ready to review</span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-sm font-bold text-stone-900 dark:text-white">
                          {mail.subject || 'No Subject'}
                        </div>
                        {mail.to && (
                          <div className="text-[11px] text-stone-500">
                            To: <strong className="font-semibold text-stone-700 dark:text-stone-300">{Array.isArray(mail.to) ? mail.to.join(', ') : mail.to}</strong>
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-black/[0.05] dark:border-white/[0.06] bg-stone-50/70 dark:bg-stone-900/50 p-3.5 text-xs text-stone-700 dark:text-stone-300 whitespace-pre-wrap font-sans leading-relaxed">
                        {mail.body}
                      </div>

                      <div className="flex items-center justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            openComposer({
                              to: Array.isArray(mail.to) ? mail.to : [mail.to].filter(Boolean),
                              subject: mail.subject,
                              body: mail.body,
                            });
                          }}
                          className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-[#B266E6] hover:bg-[#8F40C7] text-white px-4 py-1.5 text-xs font-semibold shadow-xs transition"
                        >
                          <PenSquare className="h-3.5 w-3.5" />
                          <span>Open in Composer</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              if (msg.role === 'system' && msg.query) {
                const q = msg.query;
                return (
                  <div key={msg.id || index} className="flex items-start gap-3 animate-in fade-in duration-200">
                    <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0 mt-1 shadow-2xs">
                      <Database className="h-4 w-4" />
                    </div>
                    <div className="w-full max-w-[85%] rounded-3xl rounded-tl-xs border border-emerald-500/25 bg-white dark:bg-[#181915] p-5 shadow-soft space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                          Database Query Results
                        </span>
                        <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                          {q.resultCount || (Array.isArray(q.result) ? q.result.length : 0)} Emails Found
                        </span>
                      </div>

                      {Array.isArray(q.result) && q.result.length > 0 && (
                        <div className="space-y-2 pt-1">
                          {q.result.slice(0, 5).map((item: any, idx: number) => {
                            const isOutbound = item.direction === 'outbound';
                            const toDisplay = Array.isArray(item.to) ? item.to.join(', ') : item.to;
                            return (
                              <div
                                key={idx}
                                className="flex items-start justify-between gap-3 rounded-2xl border border-black/[0.05] dark:border-white/[0.06] bg-stone-50/70 dark:bg-stone-900/50 p-3 text-xs"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                                        isOutbound
                                          ? 'bg-[#B266E6]/15 text-[#5C207E] dark:text-[#DBBFFF]'
                                          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                      }`}
                                    >
                                      {isOutbound ? (item.status === 'draft' ? 'Draft' : 'Sent') : 'Received'}
                                    </span>
                                    <div className="font-bold text-stone-900 dark:text-white truncate">
                                      {item.subject || 'No Subject'}
                                    </div>
                                  </div>
                                  <div className="text-[11px] text-stone-500 truncate mt-1">
                                    {isOutbound
                                      ? `To: ${toDisplay || 'Unknown'}`
                                      : `From: ${item.senderName || item.senderEmail || 'Unknown'}`}
                                  </div>
                                  {item.snippet && (
                                    <div className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-2 mt-1">
                                      {item.snippet}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Standard Assistant Message floating directly on canvas
              return (
                <div key={msg.id || index} className="flex items-start gap-3 animate-in fade-in duration-150">
                  <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#B266E6]/10 text-[#5C207E] dark:text-[#DBBFFF] shrink-0 mt-1 shadow-2xs">
                    <Sparkles className="h-4 w-4 text-[#B266E6]" />
                  </div>

                  <div className="w-full max-w-[90%] sm:max-w-[85%] rounded-3xl rounded-tl-xs border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#181915] p-5 text-xs sm:text-sm text-stone-900 dark:text-stone-100 shadow-soft space-y-3">
                    {/* RAG Context Notes Reference Capsule */}
                    {msg.ragNotes && msg.ragNotes.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pb-1">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#B266E6]/10 border border-[#B266E6]/25 px-2.5 py-1 text-[10px] font-bold text-[#5C207E] dark:text-[#DBBFFF]">
                          <Brain className="h-3 w-3 text-[#B266E6]" />
                          <span>RAG Memory:</span>
                          <span className="font-normal opacity-90">
                            {msg.ragNotes.map((n) => n.title).join(', ')}
                          </span>
                        </span>
                      </div>
                    )}

                    {/* Expandable Thinking Process Accordion */}
                    {msg.thought && (
                      <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] overflow-hidden text-xs">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenThoughts((prev) => ({
                              ...prev,
                              [msg.id]: !prev[msg.id],
                            }))
                          }
                          className="w-full flex items-center justify-between px-3.5 py-2 font-medium text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition"
                        >
                          <span className="flex items-center gap-1.5 text-[11px]">
                            <Sparkles className="h-3 w-3 text-[#B266E6]" />
                            Basket Reasoning Process
                          </span>
                          {openThoughts[msg.id] ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                        {openThoughts[msg.id] && (
                          <div className="px-3.5 py-2.5 border-t border-black/[0.04] dark:border-white/[0.05] text-[11px] text-stone-600 dark:text-stone-300 font-mono whitespace-pre-wrap leading-relaxed">
                            {msg.thought}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Markdown Message Body */}
                    <div className="markdown-body max-w-none text-xs sm:text-sm leading-relaxed font-sans font-normal text-stone-800 dark:text-stone-200">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        components={{
                          h1: ({ node, ...props }) => (
                            <h1 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white mt-4 mb-2 first:mt-0 font-sans tracking-tight" {...props} />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white mt-3.5 mb-1.5 first:mt-0 font-sans tracking-tight" {...props} />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3 className="text-xs sm:text-sm font-bold text-[#5C207E] dark:text-[#DBBFFF] mt-3 mb-1 first:mt-0 font-sans tracking-tight" {...props} />
                          ),
                          h4: ({ node, ...props }) => (
                            <h4 className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200 mt-2 mb-1 first:mt-0" {...props} />
                          ),
                          p: ({ node, ...props }) => (
                            <p className="my-2 leading-relaxed text-stone-800 dark:text-stone-200" {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="list-disc pl-5 my-2.5 space-y-1.5 text-stone-800 dark:text-stone-200 marker:text-[#B266E6]" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal pl-5 my-2.5 space-y-1.5 text-stone-800 dark:text-stone-200 marker:text-[#B266E6] marker:font-semibold" {...props} />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="leading-relaxed pl-1" {...props} />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong className="font-semibold text-stone-950 dark:text-white" {...props} />
                          ),
                          em: ({ node, ...props }) => (
                            <em className="italic text-stone-700 dark:text-stone-300" {...props} />
                          ),
                          blockquote: ({ node, ...props }) => (
                            <blockquote className="border-l-3 border-[#B266E6] pl-3 py-1 my-2.5 text-stone-600 dark:text-stone-400 italic bg-[#B266E6]/5 rounded-r-xl" {...props} />
                          ),
                          code: ({ node, inline, className, children, ...props }: any) => {
                            const match = /language-(\w+)/.exec(className || '');
                            const codeString = String(children).replace(/\n$/, '');
                            if (!inline && (match || codeString.includes('\n'))) {
                              return (
                                <div className="my-3 rounded-2xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] bg-stone-900 text-stone-100 text-xs font-mono shadow-xs">
                                  <div className="flex items-center justify-between px-3.5 py-1.5 bg-stone-950/70 border-b border-white/[0.06] text-[11px] text-stone-400">
                                    <span className="font-semibold uppercase tracking-wider">{match?.[1] || 'code'}</span>
                                    <button
                                      type="button"
                                      onClick={() => navigator.clipboard.writeText(codeString)}
                                      className="hover:text-white transition flex items-center gap-1 text-[10px]"
                                    >
                                      <Copy className="h-3 w-3" />
                                      <span>Copy</span>
                                    </button>
                                  </div>
                                  <pre className="p-3.5 overflow-x-auto scrollbar-clean">
                                    <code>{children}</code>
                                  </pre>
                                </div>
                              );
                            }
                            return (
                              <code className="rounded-md bg-stone-200/70 dark:bg-stone-800 px-1.5 py-0.5 text-xs font-mono text-[#5C207E] dark:text-[#DBBFFF] font-medium" {...props}>
                                {children}
                              </code>
                            );
                          },
                          table: ({ node, ...props }) => (
                            <div className="my-3 overflow-x-auto rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-2xs">
                              <table className="w-full text-left text-xs border-collapse" {...props} />
                            </div>
                          ),
                          thead: ({ node, ...props }) => (
                            <thead className="bg-stone-100/80 dark:bg-stone-900/80 border-b border-black/[0.06] dark:border-white/[0.08] font-semibold text-stone-900 dark:text-white" {...props} />
                          ),
                          tbody: ({ node, ...props }) => (
                            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]" {...props} />
                          ),
                          tr: ({ node, ...props }) => (
                            <tr className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition" {...props} />
                          ),
                          th: ({ node, ...props }) => (
                            <th className="px-3.5 py-2 text-stone-900 dark:text-white font-semibold text-[11px] uppercase tracking-wider" {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className="px-3.5 py-2 text-stone-700 dark:text-stone-300" {...props} />
                          ),
                          hr: ({ node, ...props }) => (
                            <hr className="my-3 border-black/[0.08] dark:border-white/[0.08]" {...props} />
                          ),
                          a: ({ node, ...props }) => (
                            <a className="text-[#B266E6] hover:underline font-medium break-all" target="_blank" rel="noopener noreferrer" {...props} />
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Footer Action Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-black/[0.04] dark:border-white/[0.05] text-[11px] text-stone-400">
                      <span className="flex items-center gap-1">
                        <Bot className="h-3 w-3 text-[#B266E6]" />
                        Plum Intelligence
                      </span>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
                        title="Copy Response"
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
                  </div>
                </div>
              );
            })}

            {/* Live Generation Indicator */}
            {isGenerating && statusMessage && (
              <div className="flex items-center gap-2.5 text-xs text-[#5C207E] dark:text-[#DBBFFF] pl-11 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-[#B266E6] animate-ping" />
                <span className="font-semibold">{statusMessage}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* FLOATING ISLAND CHAT BAR ANCHORED AT BOTTOM OF SCREEN          */}
      {/* ============================================================== */}
      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none p-4 sm:pb-6 bg-gradient-to-t from-[#F8F9F5] via-[#F8F9F5]/90 to-transparent dark:from-[#121310] dark:via-[#121310]/90">
        <div className="pointer-events-auto max-w-3xl w-full mx-auto">
          <div className="glass-capsule rounded-3xl border border-black/[0.08] dark:border-white/[0.1] bg-white/95 dark:bg-[#181915]/95 backdrop-blur-2xl p-3 shadow-lift flex flex-col gap-2">
            {/* Textarea */}
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
              placeholder="Ask Plum AI about your correspondence... (Enter to send, Shift + Enter for new line)"
              className="w-full resize-none border-0 bg-transparent px-2.5 pt-1 text-xs sm:text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-0 leading-relaxed font-sans max-h-40 overflow-y-auto"
            />

            {/* Bottom Controls Strip */}
            <div className="flex items-center justify-between pt-1 border-t border-black/[0.04] dark:border-white/[0.05]">
              <div className="flex items-center gap-2 text-[11px] text-stone-400 pl-1">
                <Mail className="h-3 w-3 text-[#B266E6]" />
                <span className="truncate max-w-[200px] sm:max-w-xs">
                  {activeMailbox || user?.email}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isGenerating ? (
                  <button
                    type="button"
                    onClick={stopGeneration}
                    className="focus-ring inline-flex items-center gap-1.5 rounded-2xl bg-stone-900 text-white dark:bg-white dark:text-stone-900 px-3.5 py-1.5 text-xs font-bold shadow-soft transition active:scale-95"
                  >
                    <StopCircle className="h-3.5 w-3.5" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!promptInput.trim()}
                    className="focus-ring flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-2xl bg-[#B266E6] hover:bg-[#8F40C7] text-white shadow-soft transition disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                    title="Send Message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <p className="mt-2 text-center text-[10px] sm:text-[11px] text-stone-400 dark:text-stone-500">
            Powered by Basket AI • Account-isolated correspondence • Press Enter to send, Shift + Enter for new line
          </p>
        </div>
      </div>

      {/* Context Notes Modal (Hybrid RAG) */}
      <ContextNotesModal
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        notes={notes}
        userEmail={activeMailbox || user?.email}
        onNotesChanged={loadNotes}
      />

      {/* Delete Confirmation Modal */}
      {deleteChatModal && (
        <ConfirmationModal
          isOpen={Boolean(deleteChatModal)}
          title="Delete Conversation"
          message={`Are you sure you want to delete "${deleteChatModal.title}"? This conversation history will be permanently deleted.`}
          confirmLabel="Delete"
          isDanger
          onConfirm={confirmDeleteChat}
          onCancel={() => setDeleteChatModal(null)}
        />
      )}
    </div>
  );
}
