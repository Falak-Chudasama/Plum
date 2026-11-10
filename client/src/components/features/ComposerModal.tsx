import { useState, useEffect } from 'react';
import {
  X,
  Send,
  Save,
  Sparkles,
  ChevronDown,
  Paperclip,
  CheckCircle2,
  Tag,
  Bold,
  Italic,
  List,
  Quote,
  ShieldCheck,
  Trash2,
  Wand2,
} from 'lucide-react';
import { usePlumStore } from '../../store/usePlumStore';
import { api } from '../../lib/api';
import { useToast } from '../ui/ToastProvider';

export function ComposerModal() {
  const { isComposerOpen, composerData, closeComposer, mailboxes, activeMailbox, user } = usePlumStore();
  const toast = useToast();

  const [fromMailbox, setFromMailbox] = useState('');
  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('General');
  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showAiToolbar, setShowAiToolbar] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Initialize data when modal opens
  useEffect(() => {
    if (isComposerOpen) {
      setFromMailbox(composerData?.from || activeMailbox || mailboxes[0]?.email || '');
      setToInput(Array.isArray(composerData?.to) ? composerData.to.join(', ') : composerData?.to || '');
      setCcInput(Array.isArray(composerData?.cc) ? composerData.cc.join(', ') : '');
      setBccInput(Array.isArray(composerData?.bcc) ? composerData.bcc.join(', ') : '');
      setSubject(composerData?.subject || '');
      setBody(composerData?.body || '');
      setCategory(composerData?.category || 'General');
      setShowAiToolbar(false);
      setAiPrompt('');
    }
  }, [isComposerOpen, composerData, activeMailbox, mailboxes]);

  if (!isComposerOpen) return null;

  const currentMailboxObj = mailboxes.find((m) => m.email === fromMailbox);

  const handleSend = async () => {
    const recipients = toInput
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes('@'));

    if (recipients.length === 0) {
      toast.error('Please enter at least one valid recipient email address.');
      return;
    }

    const ccList = ccInput
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes('@'));

    const bccList = bccInput
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes('@'));

    setIsSending(true);
    try {
      await api.sendEmail(
        {
          from: fromMailbox,
          to: recipients,
          cc: ccList,
          bcc: bccList,
          subject: subject || 'No Subject',
          body,
          category,
          status: 'sent',
        },
        fromMailbox
      );
      toast.success(
        `Email sent successfully to ${recipients[0]}${recipients.length > 1 ? ` and ${recipients.length - 1} others` : ''}`
      );
      closeComposer();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to send email. Check credentials.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = async () => {
    const recipients = toInput
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter(Boolean);

    setIsSavingDraft(true);
    try {
      await api.saveDraft({
        from: fromMailbox,
        to: recipients,
        subject: subject || 'Untitled Draft',
        body,
        category,
        status: 'draft',
      });
      toast.success('Draft saved successfully');
      closeComposer();
    } catch (err: any) {
      toast.error('Failed to save draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleApplyAiPreset = (preset: string) => {
    if (!body.trim()) {
      toast.info('Write some thoughts first, and Plum AI will polish or format it.');
      return;
    }

    if (preset === 'formal') {
      setBody((prev) =>
        `Dear Colleagues,\n\nI hope this correspondence finds you well.\n\n${prev.replace(/^(Dear|Hi|Hello)[^\n]*\n+/i, '').trim()}\n\nSincerely,\n${currentMailboxObj?.name || fromMailbox.split('@')[0]}`
      );
      toast.success('Formatted to formal business tone');
    } else if (preset === 'concise') {
      const lines = body.split('\n').filter(Boolean);
      setBody(lines.map((l) => `• ${l.replace(/^[-•*]\s*/, '')}`).join('\n'));
      toast.success('Converted into concise bullet points');
    } else if (preset === 'meeting') {
      setBody((prev) =>
        `${prev}\n\nPlease let me know your availability for a brief 15-minute sync later this week.\n\nBest regards,\n${currentMailboxObj?.name || fromMailbox.split('@')[0]}`
      );
      toast.success('Meeting request call-to-action appended');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex flex-col w-full max-w-3xl h-[88vh] max-h-[820px] rounded-3xl border border-black/[0.08] dark:border-white/[0.1] bg-[#F8F9F5] dark:bg-[#121310] shadow-lift overflow-hidden text-stone-900 dark:text-[#F3F4F1] transition-colors"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] px-6 py-3.5 bg-white/80 dark:bg-[#181915]/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#B266E6]/10 text-[#5C207E] dark:text-[#DBBFFF]">
              <Send className="h-3.5 w-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900 dark:text-white">
                New Message
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeComposer}
              className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Sender Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.05] dark:border-white/[0.06] px-6 py-2.5 bg-white/50 dark:bg-[#181915]/50 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              From:
            </span>
            <div className="relative inline-flex items-center">
              <select
                value={fromMailbox}
                onChange={(e) => setFromMailbox(e.target.value)}
                className="appearance-none focus-ring rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-stone-900 pl-8 pr-7 py-1 text-xs font-semibold text-stone-800 dark:text-stone-200 shadow-2xs cursor-pointer"
              >
                {mailboxes.map((m) => (
                  <option key={m.id} value={m.email}>
                    {m.name ? `${m.name} <${m.email}>` : m.email} {m.isPrimary ? '(Primary)' : ''}
                  </option>
                ))}
              </select>
              {/* Sender Avatar Icon */}
              <div className="pointer-events-none absolute left-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#B266E6]/20 text-[#5C207E] dark:text-[#DBBFFF] font-bold text-[9px] overflow-hidden">
                {currentMailboxObj?.picture ? (
                  <img src={currentMailboxObj.picture} alt="" className="h-full w-full object-cover" />
                ) : (
                  fromMailbox[0]?.toUpperCase() || 'P'
                )}
              </div>
              <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3 text-stone-400" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Google OAuth Authenticated</span>
          </div>
        </div>

        {/* Form Fields Card */}
        <div className="p-4 sm:p-6 space-y-3 flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-clean">
          <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#181915] p-3 sm:p-4 shadow-soft space-y-3">
            {/* To Field */}
            <div className="flex items-center gap-3 border-b border-black/[0.04] dark:border-white/[0.05] pb-2.5">
              <span className="text-xs font-bold text-stone-400 dark:text-stone-500 w-12 shrink-0">
                To:
              </span>
              <input
                type="text"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                placeholder="recipient@example.com (comma separated)"
                className="flex-1 bg-transparent text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none font-medium"
              />
              <button
                type="button"
                onClick={() => setShowCcBcc((prev) => !prev)}
                className="text-[11px] font-semibold text-[#B266E6] hover:text-[#8F40C7] transition shrink-0"
              >
                {showCcBcc ? 'Hide Cc/Bcc' : 'Cc / Bcc'}
              </button>
            </div>

            {/* Collapsible Cc / Bcc Fields */}
            {showCcBcc && (
              <div className="space-y-2.5 border-b border-black/[0.04] dark:border-white/[0.05] pb-2.5 animate-in fade-in duration-150">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-stone-400 dark:text-stone-500 w-12 shrink-0">
                    Cc:
                  </span>
                  <input
                    type="text"
                    value={ccInput}
                    onChange={(e) => setCcInput(e.target.value)}
                    placeholder="cc@example.com"
                    className="flex-1 bg-transparent text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-stone-400 dark:text-stone-500 w-12 shrink-0">
                    Bcc:
                  </span>
                  <input
                    type="text"
                    value={bccInput}
                    onChange={(e) => setBccInput(e.target.value)}
                    placeholder="bcc@example.com"
                    className="flex-1 bg-transparent text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Subject & Category Tag */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-xs font-bold text-stone-400 dark:text-stone-500 w-12 shrink-0">
                  Subject:
                </span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject line"
                  className="flex-1 bg-transparent text-xs sm:text-sm font-bold text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 pl-12 sm:pl-0">
                <span className="text-[11px] font-semibold text-stone-400">Tag:</span>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Category"
                  className="rounded-lg border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.04] px-2 py-1 text-xs font-semibold text-[#5C207E] dark:text-[#DBBFFF] max-w-[110px]"
                />
              </div>
            </div>
          </div>

          {/* AI Writing Assistant Toolbar */}
          <div className="rounded-2xl border border-[#B266E6]/25 bg-white dark:bg-[#181915] p-3 shadow-soft space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#5C207E] dark:text-[#DBBFFF]">
                <Sparkles className="h-4 w-4 text-[#B266E6]" />
                <span>Basket AI Writing Assistant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyAiPreset('formal')}
                  className="rounded-lg border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-stone-700 dark:text-stone-300 hover:border-[#B266E6] transition"
                >
                  ✨ Formal Tone
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyAiPreset('concise')}
                  className="rounded-lg border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-stone-700 dark:text-stone-300 hover:border-[#B266E6] transition"
                >
                  ✨ Bullets
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyAiPreset('meeting')}
                  className="rounded-lg border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-stone-700 dark:text-stone-300 hover:border-[#B266E6] transition"
                >
                  ✨ Request Meeting
                </button>
              </div>
            </div>
          </div>

          {/* Message Body Editor */}
          <div className="flex-1 flex flex-col rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#181915] shadow-soft overflow-hidden min-h-[220px]">
            {/* Editor Toolbar */}
            <div className="flex items-center gap-1 border-b border-black/[0.04] dark:border-white/[0.05] px-3 py-1.5 bg-black/[0.01] dark:bg-white/[0.01] text-stone-400">
              <button
                type="button"
                onClick={() => setBody((prev) => `${prev} **bold** `)}
                className="p-1 hover:text-stone-800 dark:hover:text-stone-200 rounded"
                title="Bold"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setBody((prev) => `${prev} *italic* `)}
                className="p-1 hover:text-stone-800 dark:hover:text-stone-200 rounded"
                title="Italic"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setBody((prev) => `${prev}\n• `)}
                className="p-1 hover:text-stone-800 dark:hover:text-stone-200 rounded"
                title="Bullet List"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setBody((prev) => `${prev}\n> `)}
                className="p-1 hover:text-stone-800 dark:hover:text-stone-200 rounded"
                title="Quote"
              >
                <Quote className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Textarea */}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email correspondence here..."
              className="flex-1 w-full resize-none p-4 text-xs sm:text-sm text-stone-900 dark:text-[#F3F4F1] placeholder-stone-400 bg-transparent focus:outline-none leading-relaxed font-normal"
            />

            {/* Character & word counter */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-black/[0.03] dark:border-white/[0.04] text-[10px] text-stone-400">
              <span>Markdown supported</span>
              <span>
                {body.length} character{body.length === 1 ? '' : 's'} • {body.split(/\s+/).filter(Boolean).length} word{body.split(/\s+/).filter(Boolean).length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="flex items-center justify-between border-t border-black/[0.06] dark:border-white/[0.08] px-6 py-3.5 bg-white/90 dark:bg-[#181915]/90 backdrop-blur-md">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSavingDraft}
            className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-stone-800 px-3.5 py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] shadow-2xs transition disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5 text-stone-400" />
            <span>{isSavingDraft ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={closeComposer}
              className="rounded-xl px-3.5 py-2 text-xs font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending}
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[#B266E6] hover:bg-[#8F40C7] text-white px-5 py-2 text-xs font-bold shadow-soft transition active:scale-95 disabled:opacity-50"
            >
              <Send className={`h-3.5 w-3.5 ${isSending ? 'animate-spin' : ''}`} />
              <span>{isSending ? 'Sending...' : 'Send Message'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
