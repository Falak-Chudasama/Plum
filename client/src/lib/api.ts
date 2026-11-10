import axios from 'axios';

const API_BASE = 'https://api.plum.com';

export const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject active mailbox header if present in localStorage
apiClient.interceptors.request.use((config) => {
  try {
    const activeMailbox = localStorage.getItem('plum_active_mailbox');
    if (activeMailbox && !config.headers['x-mailbox-email']) {
      config.headers['x-mailbox-email'] = activeMailbox;
    }
  } catch (e) {
    // ignore localstorage errors
  }
  return config;
});

export interface MailboxItem {
  id: string;
  email: string;
  name: string;
  picture: string;
  isPrimary: boolean;
  status: 'connected' | 'expired' | 'revoked';
  lastSyncAt?: string;
  hasRefreshToken: boolean;
  expiryDate?: number | null;
  expiresInSeconds?: number | null;
  tokenHealth: 'valid' | 'expiring_soon' | 'expired' | 'offline_permanent';
  createdAt?: string;
}

export interface UserProfile {
  email: string;
  name?: string;
  lastName?: string;
  profilePicture?: string;
}

export interface InboundEmailItem {
  _id?: string;
  id: string;
  threadId: string;
  email: string;
  to?: string;
  cc?: string;
  bcc?: string;
  senderEmail: string;
  senderName?: string;
  subject: string;
  parsedDate?: {
    weekday?: string;
    day?: string;
    month?: string;
    year?: string;
    time?: string;
  };
  snippet?: string;
  bodyHtml?: string;
  bodyText?: string;
  attachments?: Array<{
    filename?: string;
    mimeType?: string;
    size?: number;
    attachmentId?: string;
  }>;
  categories?: string[];
  isViewed: boolean;
  createdAt?: string;
}

export interface OutboundEmailItem {
  _id?: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  subject: string;
  body: string;
  attachments?: any[];
  category?: string;
  sentAt?: string;
  status: 'draft' | 'sent';
  createdAt?: string;
  updatedAt?: string;
  isViewed?: boolean;
}

export interface CategoryItem {
  _id?: string;
  category: string;
  description?: string;
  email: string;
  alert?: boolean;
  color?: string;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thought?: string;
  craftedMail?: any;
  query?: any;
  timestamp?: string;
}

export interface ChatSession {
  _id: string;
  title: string;
  email: string;
  lastMessageAt?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  userPrompts?: any[];
  responses?: any[];
}

export interface ContextNoteItem {
  _id: string;
  title: string;
  content: string;
  tags?: string[];
  isIndexed?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const api = {
  // --- Auth & User ---
  async getMe(): Promise<UserProfile> {
    const res = await apiClient.get('/user/me');
    return res.data.user;
  },

  async login(email: string, fName: string, lName: string): Promise<any> {
    const res = await apiClient.post('/user/auth/login', { email, fName, lName });
    return res.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/user/logout');
  },

  // --- Mailboxes ---
  async getMailboxes(): Promise<MailboxItem[]> {
    const res = await apiClient.get('/user/mailboxes');
    return res.data.mailboxes || [];
  },

  async getConnectUrl(mailboxEmail?: string): Promise<string> {
    const res = await apiClient.get('/user/mailboxes/connect-url', {
      params: mailboxEmail ? { mailboxEmail } : undefined,
    });
    return res.data.authUrl;
  },

  async refreshMailboxToken(id: string): Promise<any> {
    const res = await apiClient.post(`/user/mailboxes/${id}/refresh`);
    return res.data;
  },

  async getMailboxStatus(id: string): Promise<any> {
    const res = await apiClient.get(`/user/mailboxes/${id}/status`);
    return res.data;
  },

  async setPrimaryMailbox(id: string): Promise<any> {
    const res = await apiClient.post(`/user/mailboxes/${id}/primary`);
    return res.data;
  },

  async disconnectMailbox(id: string): Promise<any> {
    const res = await apiClient.delete(`/user/mailboxes/${id}`);
    return res.data;
  },

  // --- Emails ---
  async fetchLiveGmail(mailboxEmail?: string, numberOfEmails: number = 15): Promise<InboundEmailItem[]> {
    const res = await apiClient.post('/email/fetch', {}, {
      params: { numberOfEmails },
      headers: mailboxEmail ? { 'x-mailbox-email': mailboxEmail } : undefined,
    });
    return res.data.emails || [];
  },

  async fetchEmailsByDate(date: number | string, month: number | string, year: number | string, mailboxEmail?: string): Promise<InboundEmailItem[]> {
    const res = await apiClient.post('/email/fetch-by-date', {
      date,
      month,
      year,
      mailboxEmail,
    });
    return res.data.emails || [];
  },

  async fetchOutboundEmailsByDate(date: number | string, month: number | string, year: number | string, mailboxEmail?: string): Promise<OutboundEmailItem[]> {
    const res = await apiClient.post('/email/fetch-outbound-by-date', {
      date,
      month,
      year,
      mailboxEmail,
    });
    return res.data.emails || [];
  },

  async fetchDrafts(mailboxEmail?: string): Promise<OutboundEmailItem[]> {
    const res = await apiClient.get('/email/drafts', {
      headers: mailboxEmail ? { 'x-mailbox-email': mailboxEmail } : undefined,
    });
    return res.data.drafts || [];
  },

  async generateAiDraft(params: {
    prompt: string;
    from?: string;
    to?: string;
    currentSubject?: string;
    currentBody?: string;
  }): Promise<{ subject: string; body: string; to?: string[]; cc?: string[]; bcc?: string[] }> {
    const res = await apiClient.post('/email/ai-draft', params);
    return res.data?.draft;
  },

  async saveDraft(emailPayload: Partial<OutboundEmailItem>, mailboxEmail?: string): Promise<any> {
    const res = await apiClient.post('/email/draft', { email: emailPayload }, {
      headers: mailboxEmail ? { 'x-mailbox-email': mailboxEmail } : undefined,
    });
    return res.data;
  },

  async sendEmail(emailPayload: Partial<OutboundEmailItem>, mailboxEmail?: string): Promise<any> {
    const res = await apiClient.post('/email/send', { email: emailPayload }, {
      headers: mailboxEmail ? { 'x-mailbox-email': mailboxEmail } : undefined,
    });
    return res.data;
  },

  async markEmailAsViewed(id: string): Promise<any> {
    const res = await apiClient.patch('/email/set-is-viewed', { id });
    return res.data;
  },

  // --- Categories ---
  async getCategories(userEmail: string): Promise<CategoryItem[]> {
    const res = await apiClient.get(`/category/find`);
    return res.data?.categories || res.data?.result || [];
  },

  async createCategory(category: { category: string; description?: string; color: string; alert?: boolean }): Promise<any> {
    const res = await apiClient.post('/category/create', category);
    return res.data;
  },

  async editCategory(category: { _id: string; category: string; description?: string; color: string; alert?: boolean }): Promise<any> {
    const res = await apiClient.patch('/category/edit', category);
    return res.data;
  },

  async deleteCategory(categoryName: string): Promise<any> {
    const res = await apiClient.delete('/category/delete', {
      params: { category: categoryName },
    });
    return res.data;
  },

  // --- Chats ---
  async getChatList(email: string, limit: number = 30): Promise<ChatSession[]> {
    const res = await apiClient.get('/chat/getList', {
      params: { email, limit },
    });
    const data = res.data?.result?.chats || res.data?.chats || res.data?.result || res.data;
    return Array.isArray(data) ? data : [];
  },

  async getChatById(id: string): Promise<any> {
    const res = await apiClient.get(`/chat/get/${id}`);
    return res.data?.result || res.data?.chat || res.data;
  },

  async deleteChat(id: string): Promise<any> {
    const res = await apiClient.delete('/chat/delete', {
      params: { id },
    });
    return res.data;
  },

  async streamChatPrompt(params: {
    prompt: string;
    chatId?: string | null;
    chatCount?: number;
    email?: string;
    onMessage: (data: any) => void;
    signal?: AbortSignal;
  }): Promise<void> {
    const response = await fetch('https://api.plum.com/chat/prompt', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: params.prompt,
        chatId: params.chatId || null,
        chatCount: params.chatCount || 0,
        email: params.email,
      }),
      signal: params.signal,
    });

    if (!response.ok) {
      let errMsg = `Server responded with ${response.status}`;
      try {
        const errJson = await response.json();
        errMsg = errJson.error || errJson.message || errMsg;
      } catch (_) {}
      throw new Error(errMsg);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No readable stream available');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6).trim();
          if (jsonStr) {
            try {
              const data = JSON.parse(jsonStr);
              params.onMessage(data);
            } catch (err) {
              console.warn('Failed to parse SSE line:', jsonStr, err);
            }
          }
        }
      }
    }
  },

  // --- Context Notes & RAG ---
  async getNotes(email?: string): Promise<ContextNoteItem[]> {
    const res = await apiClient.get('/user/notes', {
      params: email ? { email } : undefined,
    });
    return res.data.notes || [];
  },

  async createNote(data: { title: string; content: string; tags?: string[]; email?: string }): Promise<ContextNoteItem> {
    const res = await apiClient.post('/user/notes', data);
    return res.data.note;
  },

  async updateNote(id: string, data: { title?: string; content?: string; tags?: string[]; email?: string }): Promise<ContextNoteItem> {
    const res = await apiClient.put(`/user/notes/${id}`, data);
    return res.data.note;
  },

  async deleteNote(id: string): Promise<void> {
    await apiClient.delete(`/user/notes/${id}`);
  },

  async searchNotesRAG(query: string, email?: string): Promise<any[]> {
    const res = await apiClient.get('/user/notes/search', {
      params: { q: query, email },
    });
    return res.data.results || [];
  },
};

