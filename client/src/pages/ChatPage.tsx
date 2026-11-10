import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  Clock,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { usePlumStore } from '../store/usePlumStore';
import { api } from '../lib/api';
import type { ChatSession } from '../lib/api';
import { useToast } from '../components/ui/ToastProvider';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thought?: string;
  craftedMail?: any;
  query?: any;
  timestamp?: string;
}

export function ChatPage() {
  const { user, activeMailbox, openComposer } = usePlumStore();
  const toast = useToast();

  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [promptInput, setPromptInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [deleteChatModal, setDeleteChatModal] = useState<ChatSession | null>(null);
  const [openThoughts, setOpenThoughts] = useState<Record<string, boolean>>({});

  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Load chat sessions for active user
  useEffect(() => {
    if (!user?.email) return;
    api.getChatList(user.email).then((list) => {
      setChats(list);
      if (list.length > 0 && !activeChatId) {
        loadChat(list[0]._id);
      }
    }).catch(console.error);
  }, [user?.email]);

  // Connect WebSocket with SSL awareness & graceful fallback
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

      ws.onopen = () => {
        if (!isCleanedUp) console.log('[PlumChat] Connected to WebSocket at', wsUrl);
      };

      ws.onmessage = (event) => {
        if (isCleanedUp) return;
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'RESPONSE') {
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
                  },
                ];
              }
            });
          } else if (data.type === 'RESPONSE_COMPLETE') {
            setIsGenerating(false);
            setStatusMessage(null);
            if (data.chatId) {
              setActiveChatId(data.chatId);
              if (user?.email) {
                api.getChatList(user.email).then((list) => {
                  if (Array.isArray(list)) setChats(list);
                }).catch(console.error);
              }
            }
          } else if (data.type === 'SYSTEM') {
            if (data.subtype === 'CRAFTED_MAIL') {
              setMessages((prev) => [
                ...prev,
                {
                  id: `crafted-${Date.now()}`,
                  role: 'system',
                  content: '',
                  craftedMail: data.mail,
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
            }
          } else if (data.type === 'INFO') {
            setStatusMessage(data.message || data.showMessage || null);
          } else if (data.type === 'ERROR') {
            setIsGenerating(false);
            setStatusMessage(null);
            toast.error(data.error || 'Chat generation error');
          }
        } catch (err) {
          console.error('Error parsing chat socket payload:', err);
        }
      };

      ws.onerror = (err) => {
        console.warn('Primary Chat WebSocket error, will retry if prompt submitted:', err);
      };
    } catch (e) {
      console.error('Failed to instantiate chat WebSocket:', e);
    }

    return () => {
      isCleanedUp = true;
      if (ws) {
        try {
          ws.close();
        } catch (_) {}
      }
    };
  }, [user?.email, toast]);

  const loadChat = async (id: string) => {
    setActiveChatId(id);
    setStatusMessage(null);
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

      // Notify socket of active chat switch
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'COMMAND',
            command: `NEW_CHAT_CLICKED:${id}`,
          })
        );
      }
    } catch (err) {
      console.error('Error loading chat session:', err);
    }
  };

  const startNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setStatusMessage(null);
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'COMMAND',
          command: 'CLEAR_CONTEXT',
        })
      );
    }
  };

  const handleSendMessage = () => {
    const text = promptInput.trim();
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

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'PROMPT',
          prompt: text,
          email: activeMailbox || user?.email,
          chatId: activeChatId,
          chatCount: messages.filter((m) => m.role === 'user').length,
        })
      );
    } else {
      toast.error('Chat WebSocket not connected. Reconnecting...');
      setIsGenerating(false);
      setStatusMessage(null);
    }
  };

  const stopGeneration = () => {
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
      setChats((prev) => prev.filter((c) => c._id !== deleteChatModal._id));
      if (activeChatId === deleteChatModal._id) {
        startNewChat();
      }
      toast.success('Conversation removed');
      setDeleteChatModal(null);
    } catch (err) {
      toast.error('Failed to delete conversation');
    }
  };

  const activeChat = chats.find((c) => c._id === activeChatId);

  return (
    <PageShell
      title="Email Intelligence Chat"
      subtitle={`Powered by Basket AI • Active Mailbox Context: ${activeMailbox || 'Global'}`}
      action={
        <button
          type="button"
          onClick={startNewChat}
          className="focus-ring inline-flex items-center gap-1.5 rounded-2xl bg-[#B266E6] hover:bg-[#8F40C7] text-white px-3.5 py-2 text-xs font-semibold shadow-soft transition"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Conversation</span>
        </button>
      }
    >
      <div className="flex h-[74vh] rounded-3xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#181915] shadow-lift overflow-hidden">
        {/* Left Sidebar: Conversations Drawer */}
        <aside className="hidden md:flex flex-col w-64 border-r border-black/[0.06] dark:border-white/[0.08] bg-black/[0.01] dark:bg-white/[0.01]">
          <div className="p-3 border-b border-black/[0.05] dark:border-white/[0.06]">
            <button
              type="button"
              onClick={startNewChat}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-black/[0.15] dark:border-white/[0.15] py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:border-[#B266E6] hover:text-[#B266E6] transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Start New Chat</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-clean">
            {(Array.isArray(chats) ? chats : []).map((chat) => {
              const isSelected = chat._id === activeChatId;
              return (
                <div
                  key={chat._id}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs cursor-pointer transition ${
                    isSelected
                      ? 'bg-[#B266E6]/10 text-stone-900 dark:text-white font-bold'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                  }`}
                  onClick={() => loadChat(chat._id)}
                >
                  <span className="truncate flex-1">{chat.title || 'Untitled Chat'}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteChatModal(chat);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-rose-500 rounded transition"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] px-5 py-3 bg-black/[0.01] dark:bg-white/[0.01]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-display text-xs font-bold text-stone-900 dark:text-white truncate">
                {activeChat?.title || 'New Conversation'}
              </span>
              <span className="rounded-full bg-[#B266E6]/10 px-2 py-0.5 text-[10px] font-semibold text-[#5C207E] dark:text-[#DBBFFF]">
                {activeMailbox ? `Context: ${activeMailbox.split('@')[0]}` : 'General'}
              </span>
            </div>

            {isGenerating && (
              <button
                type="button"
                onClick={stopGeneration}
                className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2.5 py-1 text-[11px] font-semibold hover:bg-rose-500/20 transition"
              >
                <StopCircle className="h-3.5 w-3.5" />
                <span>Stop</span>
              </button>
            )}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-clean">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B266E6]/10 text-[#B266E6] mb-3">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h4 className="font-display text-sm font-bold text-stone-900 dark:text-white">
                  How can Plum AI assist you?
                </h4>
                <p className="mt-1 max-w-sm text-xs text-stone-500 dark:text-stone-400">
                  Ask to summarize emails, search past correspondence, draft replies, or look up academic deadlines.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-md">
                  {[
                    'Show emails from my professors',
                    'Draft a reply asking for a deadline extension',
                    'Find unread emails from Somaiya',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setPromptInput(preset);
                      }}
                      className="rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.03] px-3 py-1.5 text-xs text-stone-700 dark:text-stone-300 hover:border-[#B266E6] transition"
                    >
                      "{preset}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className="space-y-2">
                {msg.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 px-4 py-2.5 text-xs leading-relaxed font-medium shadow-xs">
                      {msg.content}
                    </div>
                  </div>
                ) : msg.role === 'assistant' ? (
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#B266E6]/15 text-[#B266E6] mt-0.5">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 space-y-2 min-w-0">
                      {/* Thought Collapsible */}
                      {msg.thought && (
                        <div className="rounded-xl border border-black/[0.05] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] p-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenThoughts((prev) => ({ ...prev, [msg.id]: !prev[msg.id] }))
                            }
                            className="flex items-center gap-1.5 font-bold text-stone-500 dark:text-stone-400 hover:text-stone-800"
                          >
                            {openThoughts[msg.id] ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                            <span>AI Thought Process</span>
                          </button>
                          {openThoughts[msg.id] && (
                            <div className="mt-2 pl-4 border-l border-stone-300 dark:border-stone-700 font-mono text-[10px] text-stone-600 dark:text-stone-400 whitespace-pre-wrap">
                              {msg.thought}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Assistant Text */}
                      <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed font-normal text-stone-800 dark:text-stone-200">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* System Cards (Crafted Email or DB Query) */
                  <div className="ml-10 space-y-2">
                    {msg.craftedMail && (
                      <div className="rounded-2xl border border-[#B266E6]/30 bg-[#B266E6]/5 dark:bg-[#B266E6]/10 p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#5C207E] dark:text-[#DBBFFF]">
                            <Mail className="h-4 w-4" />
                            <span>AI Drafted Email</span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              openComposer({
                                to: msg.craftedMail.to,
                                cc: msg.craftedMail.cc,
                                subject: msg.craftedMail.subject,
                                body: msg.craftedMail.body,
                                category: msg.craftedMail.category?.[0] || 'General',
                              })
                            }
                            className="focus-ring inline-flex items-center gap-1 rounded-xl bg-[#B266E6] hover:bg-[#8F40C7] text-white px-2.5 py-1 text-[11px] font-semibold transition"
                          >
                            <PenSquare className="h-3 w-3" />
                            <span>Open in Composer</span>
                          </button>
                        </div>

                        <div className="rounded-xl bg-white dark:bg-stone-900 p-3 border border-black/[0.05] dark:border-white/[0.06] text-xs space-y-1">
                          <div>
                            <strong className="text-stone-400">To:</strong>{' '}
                            <span className="font-semibold text-stone-800 dark:text-stone-200">
                              {Array.isArray(msg.craftedMail.to) ? msg.craftedMail.to.join(', ') : msg.craftedMail.to}
                            </span>
                          </div>
                          <div>
                            <strong className="text-stone-400">Subject:</strong>{' '}
                            <span className="font-semibold text-stone-800 dark:text-stone-200">
                              {msg.craftedMail.subject}
                            </span>
                          </div>
                          <div className="mt-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.06] whitespace-pre-wrap text-stone-700 dark:text-stone-300">
                            {msg.craftedMail.body}
                          </div>
                        </div>
                      </div>
                    )}

                    {msg.query && (
                      <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.03] p-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-300">
                          <Database className="h-3.5 w-3.5 text-[#89D66D]" />
                          <span>Database Search Query</span>
                          <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px]">
                            {msg.query.resultCount || 0} match{(msg.query.resultCount || 0) === 1 ? '' : 'es'}
                          </span>
                        </div>
                        <div className="font-mono text-[10px] bg-black/5 dark:bg-white/5 p-2 rounded-xl text-stone-600 dark:text-stone-400 truncate">
                          {typeof msg.query.query === 'string' ? msg.query.query : JSON.stringify(msg.query.query)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {statusMessage && (
              <div className="flex items-center gap-2 text-xs text-stone-400 ml-10 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-[#B266E6]" />
                <span>{statusMessage}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="border-t border-black/[0.06] dark:border-white/[0.08] p-3 bg-black/[0.01] dark:bg-white/[0.01]">
            <div className="flex items-end gap-2 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-stone-900 p-2 shadow-xs focus-within:ring-2 focus-within:ring-[#B266E6]/50 transition">
              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                placeholder={`Ask Plum AI about ${activeMailbox || 'your emails'}... (Enter to send, Shift+Enter for new line)`}
                className="flex-1 max-h-32 resize-none bg-transparent px-2 py-1 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={isGenerating || !promptInput.trim()}
                className="focus-ring flex h-8 w-8 items-center justify-center rounded-xl bg-[#B266E6] hover:bg-[#8F40C7] text-white shadow-soft transition disabled:opacity-40 shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Chat Confirmation */}
      <ConfirmationModal
        isOpen={Boolean(deleteChatModal)}
        onClose={() => setDeleteChatModal(null)}
        onConfirm={confirmDeleteChat}
        title="Delete Conversation"
        description={`Are you sure you want to delete "${deleteChatModal?.title || 'this conversation'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isDestructive={true}
      />
    </PageShell>
  );
}
