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
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { usePlumStore } from '../store/usePlumStore';
import { api } from '../lib/api';
import type { ChatSession, ContextNoteItem } from '../lib/api';
import { useToast } from '../components/ui/ToastProvider';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { ContextNotesModal } from '../components/features/ContextNotesModal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { playEnter, playScroll, playNotification, playBack } from '../lib/sound';

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

  // Collapsible Menu state (floating conversations drawer)
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  // Context Notes (Hybrid RAG) state
  const [notes, setNotes] = useState<ContextNoteItem[]>([]);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [activeRagNotes, setActiveRagNotes] = useState<any[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, statusMessage]);

  // Load chat session list
  const reloadChats = async () => {
    try {
      const data = await api.getChats();
      setChats(data || []);
    } catch (err) {
      // non-fatal
    }
  };

  useEffect(() => {
    reloadChats();
  }, [activeMailbox, user?.email]);

  // Load context notes for count badge
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

  const loadChat = async (id: string) => {
    playScroll();
    setChatId(id);
    setStatusMessage(null);
    setIsMenuOpen(false);
    try {
      const chat = await api.getChatById(id);
      if (!chat) return;

      const loadedMessages: Message[] = [];

      // Check standard 3-tier messages array first
      if (Array.isArray(chat.messages) && chat.messages.length > 0) {
        chat.messages.forEach((m: any, idx: number) => {
          loadedMessages.push({
            id: `msg-${idx}-${Date.now()}`,
            role: m.role || 'user',
            content: m.content || '',
            timestamp: m.created_at,
          });
        });
      } else {
        // Fallback to legacy userPrompts / responses
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
    setIsMenuOpen(false);
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

    setMessages((prev) => [...prev, userMessage]);
    setPromptInput('');
    setIsGenerating(true);
    setStatusMessage('Thinking with Basket AI...');

    const currentChatId = activeChatIdRef.current ?? activeChatId;

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('https://api.basket.jam/chat/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Basket-Application': 'plum',
        },
        body: JSON.stringify({
          text,
          application: 'plum',
          chat_id: currentChatId || null,
          retrieve_chat: true,
          retrieve_notes: true,
          synthesize_speech: false,
          llm: {
            system_prompt: 'You are Plum, the intelligent personal calendar and email assistant.',
          },
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        let errMsg = `Basket error (${response.status})`;
        try {
          const errJson = await response.json();
          errMsg = errJson.detail || errJson.message || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No readable stream available');

      const decoder = new TextDecoder();
      let buffer = '';
      let activeId = currentChatId;
      const assistantMessageId = `asst-${Date.now()}`;

      // Insert placeholder assistant message
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
        },
      ]);
      setStatusMessage(null);

      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            currentEvent = '';
            continue;
          }

          if (trimmed.startsWith('event: ')) {
            currentEvent = trimmed.slice(7).trim();
            continue;
          }

          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr);

              // Update active chat ID if new session initialized
              if (data.chat_id && !activeId) {
                activeId = data.chat_id;
                setChatId(data.chat_id);
                reloadChats();
              }

              if (currentEvent === 'delta') {
                const token = data.content !== undefined ? data.content : (data.data || '');
                if (token) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: msg.content + token }
                        : msg
                    )
                  );
                }
              } else if (currentEvent === 'done') {
                if (data.chat_id && activeChatIdRef.current !== data.chat_id) {
                  setChatId(data.chat_id);
                }
                reloadChats();
              } else if (data.type === 'error') {
                toast.error(data.message || 'Basket error');
              }
            } catch (err) {
              console.warn('Failed to parse SSE line:', jsonStr, err);
            }
          }
        }
      }

      setIsGenerating(false);
      setStatusMessage(null);
      reloadChats();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error(err.message || 'Failed to generate response with Basket AI');
      }
      setIsGenerating(false);
      setStatusMessage(null);
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
    playNotification();
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
      'Previous 7 Days': [],
      Older: [],
    };

    filtered.forEach((chat) => {
      const dateStr = chat.updated_at || chat.created_at || chat.updatedAt || chat.createdAt;
      const parsedTime = dateStr ? new Date(dateStr).getTime() : Date.now();
      const chatTime = isNaN(parsedTime) ? Date.now() : parsedTime;
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
    <div className="min-h-screen flex flex-col relative font-sans antialiased overflow-x-hidden">

      {/* Floating Stationary Quick Bar */}
      <div className="fixed top-20 left-4 sm:left-6 z-40 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            playScroll();
            setIsMenuOpen((prev) => !prev);
          }}
          className={`focus-ring inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-bold shadow-lift backdrop-blur-2xl transition-all active:scale-95 ${
            isMenuOpen
              ? 'bg-[#7E36B2] text-white border-[#7E36B2]'
              : 'border-black/[0.08] dark:border-white/[0.1] bg-white/90 dark:bg-[#181915]/90 text-stone-800 dark:text-stone-200 hover:border-[#B266E6]/40 hover:bg-white dark:hover:bg-[#181915]'
          }`}
          title="Toggle Conversations History"
        >
          <PanelLeft className={`h-4 w-4 ${isMenuOpen ? 'text-white' : 'text-[#7E36B2] dark:text-[#DBBFFF]'}`} />
          <span>Conversations</span>
          {chats.length > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                isMenuOpen
                  ? 'bg-white/20 text-white'
                  : 'bg-[#B266E6]/15 text-[#7E36B2] dark:text-[#DBBFFF]'
              }`}
            >
              {chats.length}
            </span>
          )}
        </button>

        <Button
          variant="primary"
          size="sm"
          onClick={startNewChat}
          icon={<Plus className="h-3.5 w-3.5" />}
          title="Start New Conversation"
        >
          <span className="hidden sm:inline">New Chat</span>
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            playEnter();
            setIsNotesModalOpen(true);
          }}
          icon={<Brain className="h-3.5 w-3.5 text-[#7E36B2] dark:text-[#DBBFFF]" />}
          title="Context Notes (Hybrid Vector + BM25 RAG Memory)"
        >
          <span>Notes</span>
          {notes.length > 0 && (
            <span className="rounded-full bg-[#B266E6]/15 text-[#7E36B2] dark:text-[#DBBFFF] px-1.5 py-0.5 text-[10px] font-bold">
              {notes.length}
            </span>
          )}
        </Button>
      </div>

      {/* Floating Conversations Window */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-stone-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => {
              playBack();
              setIsMenuOpen(false);
            }}
          />

          <div className="fixed top-32 left-4 sm:left-6 z-50 w-80 sm:w-88 max-w-[calc(100vw-2rem)] h-[calc(100vh-10rem)] max-h-[640px] rounded-[2rem] glass-panel border border-black/[0.08] dark:border-white/[0.1] bg-white/95 dark:bg-[#181915]/95 backdrop-blur-2xl shadow-lift flex flex-col overflow-hidden animate-scale-in">
            <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between bg-stone-50/60 dark:bg-stone-900/40">
              <div className="flex items-center gap-2 font-bold text-sm text-stone-900 dark:text-white">
                <MessageSquare className="h-4 w-4 text-[#7E36B2] dark:text-[#DBBFFF]" />
                <span>Conversations</span>
                <span className="rounded-full bg-[#B266E6]/10 text-[#7E36B2] dark:text-[#DBBFFF] text-[10px] px-2 py-0.5 font-bold">
                  {chats.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  playBack();
                  setIsMenuOpen(false);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3.5 space-y-2.5 border-b border-black/[0.05] dark:border-white/[0.06]">
              <Button
                variant="primary"
                size="sm"
                onClick={startNewChat}
                icon={<Plus className="h-4 w-4" />}
                className="w-full justify-center"
              >
                New Conversation
              </Button>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                <input
                  type="text"
                  value={chatSearchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-stone-900/80 pl-8 pr-3 py-1.5 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#B266E6]"
                />
              </div>
            </div>

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
                            className={`group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition ${
                              isActive
                                ? 'bg-[#B266E6]/10 text-stone-900 dark:text-white font-semibold'
                                : 'text-stone-600 dark:text-stone-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => loadChat(c._id)}
                              className="flex-1 text-left truncate"
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
                              className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-rose-500 transition"
                              title="Delete conversation"
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
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Stream */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-32 pb-44 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center space-y-6 pt-8 pb-16 animate-in fade-in duration-300">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-[#B266E6]/25 via-[#DBBFFF]/20 to-[#89D66D]/20 text-[#7E36B2] dark:text-[#DBBFFF] shadow-lift">
              <Sparkles className="h-8 w-8 text-[#7E36B2] dark:text-[#DBBFFF]" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-white font-heading">
                How can Plum assist you today?
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-md">
                Search your correspondence, draft professional emails, or check academic notices with Basket AI.
              </p>
            </div>

            {/* Prompt Suggestion Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left pt-2">
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
                    className="group flex flex-col justify-between p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] glass-card hover:border-[#B266E6]/40 transition-all shadow-soft text-left"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-stone-900 dark:text-white group-hover:text-[#7E36B2] dark:group-hover:text-[#DBBFFF] transition">
                        {item.title}
                      </span>
                      <Icon className="h-4 w-4 text-stone-400 group-hover:text-[#7E36B2] dark:group-hover:text-[#DBBFFF] transition" />
                    </div>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-2">
                      "{item.prompt}"
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg, index) => {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id || index} className="flex justify-end animate-in fade-in duration-150">
                    <div className="bg-[#7E36B2] text-white rounded-3xl rounded-tr-xs px-5 py-3 text-xs sm:text-sm shadow-soft max-w-[85%] sm:max-w-[75%] leading-relaxed font-medium">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              if (msg.role === 'system' && msg.craftedMail) {
                const mail = msg.craftedMail;
                return (
                  <div key={msg.id || index} className="flex items-start gap-3 animate-in fade-in duration-200">
                    <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#B266E6]/15 text-[#7E36B2] dark:text-[#DBBFFF] shrink-0 mt-1 shadow-2xs">
                      <PenSquare className="h-4 w-4 text-[#7E36B2] dark:text-[#DBBFFF]" />
                    </div>
                    <div className="w-full max-w-[85%] rounded-3xl rounded-tl-xs border border-[#B266E6]/30 bg-white dark:bg-[#181915] p-5 shadow-soft space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#7E36B2] dark:text-[#DBBFFF]">
                          Email Draft Prepared
                        </span>
                        <span className="text-[10px] text-stone-400 font-semibold">Ready to review</span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-sm font-bold text-stone-900 dark:text-white">
                          {mail.subject || 'No Subject'}
                        </div>
                        {mail.to && (
                          <div className="text-[10px] text-stone-500">
                            To: <strong className="font-semibold text-stone-700 dark:text-stone-300">{Array.isArray(mail.to) ? mail.to.join(', ') : mail.to}</strong>
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-black/[0.05] dark:border-white/[0.06] bg-stone-50/70 dark:bg-stone-900/50 p-3.5 text-xs text-stone-700 dark:text-stone-300 whitespace-pre-wrap font-sans leading-relaxed">
                        {mail.body}
                      </div>

                      <div className="flex items-center justify-end pt-1">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            openComposer({
                              to: Array.isArray(mail.to) ? mail.to : [mail.to].filter(Boolean),
                              subject: mail.subject,
                              body: mail.body,
                            });
                          }}
                          icon={<PenSquare className="h-3.5 w-3.5" />}
                        >
                          Open in Composer
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              }

              // Standard Assistant Message
              return (
                <div key={msg.id || index} className="flex items-start gap-3 animate-in fade-in duration-150">
                  <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#B266E6]/10 text-[#7E36B2] dark:text-[#DBBFFF] shrink-0 mt-1 shadow-2xs">
                    <Sparkles className="h-4 w-4 text-[#7E36B2] dark:text-[#DBBFFF]" />
                  </div>

                  <div className="w-full max-w-[90%] sm:max-w-[85%] rounded-3xl rounded-tl-xs border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#181915] p-5 text-xs sm:text-sm text-stone-900 dark:text-stone-100 shadow-soft space-y-3">
                    {/* RAG Context Notes Badge */}
                    {msg.ragNotes && msg.ragNotes.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pb-1">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#B266E6]/10 border border-[#B266E6]/25 px-2.5 py-1 text-[10px] font-bold text-[#7E36B2] dark:text-[#DBBFFF]">
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
                          <span className="flex items-center gap-1.5 text-[10px]">
                            <Sparkles className="h-3 w-3 text-[#7E36B2] dark:text-[#DBBFFF]" />
                            Basket Reasoning Process
                          </span>
                          {openThoughts[msg.id] ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                        {openThoughts[msg.id] && (
                          <div className="px-3.5 py-2.5 border-t border-black/[0.04] dark:border-white/[0.05] text-[10px] text-stone-600 dark:text-stone-300 font-mono whitespace-pre-wrap leading-relaxed">
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
                            <h1 className="text-base sm:text-xl font-bold text-stone-900 dark:text-white mt-4 mb-2 first:mt-0 font-sans tracking-tight" {...props} />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white mt-3.5 mb-1.5 first:mt-0 font-sans tracking-tight" {...props} />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3 className="text-xs sm:text-sm font-bold text-[#7E36B2] dark:text-[#DBBFFF] mt-3 mb-1 first:mt-0 font-sans tracking-tight" {...props} />
                          ),
                          p: ({ node, ...props }) => (
                            <p className="my-2 leading-relaxed text-stone-800 dark:text-stone-200" {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="list-disc pl-5 my-2.5 space-y-1.5 text-stone-800 dark:text-stone-200 marker:text-[#7E36B2] dark:marker:text-[#DBBFFF]" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal pl-5 my-2.5 space-y-1.5 text-stone-800 dark:text-stone-200 marker:text-[#7E36B2] dark:marker:text-[#DBBFFF] marker:font-semibold" {...props} />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="leading-relaxed pl-1" {...props} />
                          ),
                          blockquote: ({ node, ...props }) => (
                            <blockquote className="border-l-3 border-[#7E36B2] pl-3 py-1 my-2.5 text-stone-600 dark:text-stone-400 italic bg-[#B266E6]/5 rounded-r-xl" {...props} />
                          ),
                          code: ({ node, inline, className, children, ...props }: any) => {
                            const match = /language-(\w+)/.exec(className || '');
                            const codeString = String(children).replace(/\n$/, '');
                            if (!inline && (match || codeString.includes('\n'))) {
                              return (
                                <div className="my-3 rounded-2xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] bg-stone-900 text-stone-100 text-xs font-mono shadow-xs">
                                  <div className="flex items-center justify-between px-3.5 py-1.5 bg-stone-950/70 border-b border-white/[0.06] text-[10px] text-stone-400">
                                    <span className="font-semibold uppercase tracking-wider">{match?.[1] || 'code'}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(codeString);
                                        playNotification();
                                      }}
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
                              <code className="rounded-lg bg-stone-200/70 dark:bg-stone-800 px-1.5 py-0.5 text-xs font-mono text-[#7E36B2] dark:text-[#DBBFFF] font-medium" {...props}>
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Footer Action Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-black/[0.04] dark:border-white/[0.05] text-[10px] text-stone-400">
                      <span className="flex items-center gap-1">
                        <Bot className="h-3 w-3 text-[#7E36B2] dark:text-[#DBBFFF]" />
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

            {isGenerating && statusMessage && (
              <div className="flex items-center gap-2.5 text-xs text-[#7E36B2] dark:text-[#DBBFFF] pl-11 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-[#B266E6] animate-ping" />
                <span className="font-semibold">{statusMessage}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Floating Island Chat Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none p-4 sm:pb-6 bg-gradient-to-t from-[#F8F9F5] via-[#F8F9F5]/90 to-transparent dark:from-[#121310] dark:via-[#121310]/90">
        <div className="pointer-events-auto max-w-3xl w-full mx-auto">
          <div className="glass-capsule rounded-3xl border border-black/[0.08] dark:border-white/[0.1] bg-white/95 dark:bg-[#181915]/95 backdrop-blur-2xl p-3 shadow-lift flex flex-col gap-2">
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

            <div className="flex items-center justify-between pt-1 border-t border-black/[0.04] dark:border-white/[0.05]">
              <div className="flex items-center gap-2 text-[10px] text-stone-400 pl-1">
                <Mail className="h-3 w-3 text-[#7E36B2] dark:text-[#DBBFFF]" />
                <span className="truncate max-w-[200px] sm:max-w-xs">
                  {activeMailbox || user?.email}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isGenerating ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={stopGeneration}
                    icon={<StopCircle className="h-3.5 w-3.5" />}
                  >
                    Stop
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSendMessage()}
                    disabled={!promptInput.trim()}
                    icon={<Send className="h-4 w-4" />}
                    className="min-h-[36px] min-w-[36px] p-2"
                    title="Send Message"
                  />
                )}
              </div>
            </div>
          </div>

          <p className="mt-2 text-center text-[10px] text-stone-400 dark:text-stone-500">
            Powered by Basket AI • Account-isolated correspondence • Press Enter to send, Shift + Enter for new line
          </p>
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
            Are you sure you want to delete <strong className="text-stone-900 dark:text-white">"{deleteChatModal?.title}"</strong>? This will permanently remove its message history.
          </span>
        }
      />
    </div>
  );
}
