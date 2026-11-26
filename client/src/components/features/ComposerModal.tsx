import { useState, useEffect } from 'react';
import { X, Sparkles, ChevronDown, AlertTriangle, KeyRound } from 'lucide-react';
import { usePlumStore } from '../../store/usePlumStore';
import { api } from '../../lib/api';
import { useToast } from '../ui/ToastProvider';
import { Button } from '../ui/Button';
import { DynamicIslandModal } from '../ui/DynamicIslandModal';
import { playBack, playEnter } from '../../lib/sound';

export function ComposerModal() {
  const { isComposerOpen, composerData, closeComposer, mailboxes, activeMailbox } = usePlumStore();
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
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [showAiBar, setShowAiBar] = useState(false);

  useEffect(() => {
    if (isComposerOpen) {
      setFromMailbox(composerData?.from || activeMailbox || mailboxes[0]?.email || '');
      setToInput(Array.isArray(composerData?.to) ? composerData.to.join(', ') : composerData?.to || '');
      setCcInput(Array.isArray(composerData?.cc) ? composerData.cc.join(', ') : '');
      setBccInput(Array.isArray(composerData?.bcc) ? composerData.bcc.join(', ') : '');
      setSubject(composerData?.subject || '');
      setBody(composerData?.body || '');
      setCategory(composerData?.category || 'General');
      setAiPrompt('');
      setShowAiBar(false);
      setShowCcBcc(Boolean(composerData?.cc?.length || composerData?.bcc?.length));
    }
  }, [isComposerOpen, composerData, activeMailbox, mailboxes]);

  const selectedFromMailbox = mailboxes.find(
    (m) => m.email.toLowerCase() === fromMailbox.toLowerCase()
  );
  const isFromExpired = Boolean(
    selectedFromMailbox &&
      (selectedFromMailbox.status === 'expired' ||
        selectedFromMailbox.status === 'revoked' ||
        selectedFromMailbox.tokenHealth === 'expired' ||
        !selectedFromMailbox.hasRefreshToken)
  );

  const handleReauthorizeSender = async () => {
    playEnter();
    try {
      const authUrl = await api.getConnectUrl(fromMailbox);
      if (authUrl) {
        window.location.href = authUrl;
        return;
      }
    } catch {}
    window.location.href = `https://api.plum.jam/user/mailboxes/connect?mailboxEmail=${encodeURIComponent(fromMailbox)}`;
  };

  const handleClose = () => {
    closeComposer();
  };

  const handleSend = async () => {
    const recipients = toInput
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes('@'));

    if (recipients.length === 0) {
      toast.error('Enter at least one valid recipient email.');
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
    playEnter();
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
        `Sent to ${recipients[0]}${recipients.length > 1 ? ` +${recipients.length - 1}` : ''}`
      );
      closeComposer();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to send email.');
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
    playEnter();
    try {
      await api.saveDraft(
        {
          from: fromMailbox,
          to: recipients,
          subject: subject || 'Untitled Draft',
          body,
          category,
          status: 'draft',
        },
        fromMailbox
      );
      toast.success('Draft saved');
      closeComposer();
    } catch {
      toast.error('Failed to save draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleGenerateAiEmail = async () => {
    if (!aiPrompt.trim()) {
      toast.warning('Enter an AI instruction');
      return;
    }

    setIsAiGenerating(true);
    playEnter();
    try {
      const draft = await api.generateAiDraft({
        prompt: aiPrompt.trim(),
        from: fromMailbox,
        to: toInput,
        currentSubject: subject,
        currentBody: body,
      });

      if (draft.body) setBody(draft.body);
      if (draft.subject && (!subject.trim() || subject === 'No Subject' || subject === 'Untitled Draft')) {
        setSubject(draft.subject);
      }
      if (draft.to && draft.to.length > 0 && !toInput.trim()) {
        setToInput(draft.to.join(', '));
      }

      setAiPrompt('');
      setShowAiBar(false);
      toast.success('Draft updated');
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'AI draft failed');
    } finally {
      setIsAiGenerating(false);
    }
  };

  return (
    <DynamicIslandModal
      isOpen={isComposerOpen}
      onClose={handleClose}
      maxWidthClass="max-w-2xl"
      ariaLabelledBy="composer-modal-title"
    >
      {/* Clean Cherry Header */}
      <div className="flex items-center justify-between gap-3 px-6 h-14 border-b border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-[#161714]/80 backdrop-blur-xl shrink-0">
        <h2 id="composer-modal-title" className="text-[15px] font-semibold tracking-[-0.01em] text-stone-900 dark:text-white shrink-0">
          New Message
        </h2>

        <div className="flex items-center gap-2 min-w-0">
          <div className="relative inline-flex items-center min-w-0 max-w-[230px]">
            <select
              value={fromMailbox}
              onChange={(e) => setFromMailbox(e.target.value)}
              className="focus-ring appearance-none rounded-full border border-black/[0.08] dark:border-white/[0.1] bg-stone-50 dark:bg-stone-900/80 pl-3 pr-7 h-7 text-xs font-medium text-stone-700 dark:text-stone-300 cursor-pointer truncate max-w-full"
            >
              {mailboxes.map((m) => (
                <option key={m.id} value={m.email}>
                  {m.email}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3 text-stone-400" />
          </div>

          <button
            type="button"
            onClick={() => {
              playEnter();
              setShowAiBar((v) => !v);
            }}
            className={`focus-ring btn-interactive shadow-none inline-flex items-center gap-1 rounded-full px-2.5 h-7 text-xs font-medium border shrink-0 ${
              showAiBar
                ? 'bg-[#B266E6]/12 border-[#B266E6]/35 text-[#7E36B2] dark:text-[#DBBFFF]'
                : 'border-black/[0.08] dark:border-white/[0.1] text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <Sparkles className="h-3 w-3 text-[#7E36B2] dark:text-[#DBBFFF]" />
            <span>AI Draft</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playBack();
              handleClose();
            }}
            aria-label="Close composer"
            className="focus-ring btn-interactive shadow-none flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Collapsible Minimal AI Bar */}
      {showAiBar && (
        <div className="px-6 py-2.5 border-b border-black/[0.06] dark:border-white/[0.08] bg-stone-50 dark:bg-stone-900/60 flex items-center gap-2 shrink-0 animate-fade-in">
          <Sparkles className="h-3.5 w-3.5 text-[#7E36B2] dark:text-[#DBBFFF] shrink-0" />
          <input
            type="text"
            autoFocus
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleGenerateAiEmail();
              }
            }}
            disabled={isAiGenerating}
            placeholder={body.trim() ? 'Ask AI to refine this email...' : 'Describe the email to draft...'}
            className="flex-1 bg-transparent text-[13px] text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none min-w-0"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerateAiEmail}
            disabled={isAiGenerating || !aiPrompt.trim()}
            isLoading={isAiGenerating}
          >
            {body.trim() ? 'Refine' : 'Write'}
          </Button>
        </div>
      )}

      {/* Expired Sender Token Notice inside Composer */}
      {isFromExpired && (
        <div className="px-6 py-2 border-b border-rose-500/20 bg-rose-500/10 flex items-center justify-between gap-3 text-xs text-rose-700 dark:text-rose-300 shrink-0 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              Authorization expired for <strong>{fromMailbox}</strong>
            </span>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleReauthorizeSender}
            icon={<KeyRound className="h-3 w-3" />}
            className="!h-7 !px-2.5 !text-[11px] shrink-0"
          >
            Reauthorize
          </Button>
        </div>
      )}

      {/* Clean Single-Surface Envelope Rows (Linear / Cherry style, no nested card boxes) */}
      <div className="px-6 divide-y divide-black/[0.05] dark:divide-white/[0.06] border-b border-black/[0.06] dark:border-white/[0.08] shrink-0">
        <div className="flex items-center gap-3 h-11">
          <span className="text-xs font-medium text-stone-400 dark:text-stone-500 w-12 shrink-0">
            To
          </span>
          <input
            type="text"
            value={toInput}
            onChange={(e) => setToInput(e.target.value)}
            placeholder="recipient@example.com"
            className="flex-1 bg-transparent text-[13px] text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none min-w-0"
          />
          <button
            type="button"
            onClick={() => setShowCcBcc((prev) => !prev)}
            className="text-xs font-medium text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition shrink-0"
          >
            {showCcBcc ? 'Hide Cc' : 'Cc / Bcc'}
          </button>
        </div>

        {showCcBcc && (
          <>
            <div className="flex items-center gap-3 h-10">
              <span className="text-xs font-medium text-stone-400 dark:text-stone-500 w-12 shrink-0">
                Cc
              </span>
              <input
                type="text"
                value={ccInput}
                onChange={(e) => setCcInput(e.target.value)}
                placeholder="cc@example.com"
                className="flex-1 bg-transparent text-[13px] text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none min-w-0"
              />
            </div>
            <div className="flex items-center gap-3 h-10">
              <span className="text-xs font-medium text-stone-400 dark:text-stone-500 w-12 shrink-0">
                Bcc
              </span>
              <input
                type="text"
                value={bccInput}
                onChange={(e) => setBccInput(e.target.value)}
                placeholder="bcc@example.com"
                className="flex-1 bg-transparent text-[13px] text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none min-w-0"
              />
            </div>
          </>
        )}

        <div className="flex items-center gap-3 h-11">
          <span className="text-xs font-medium text-stone-400 dark:text-stone-500 w-12 shrink-0">
            Subject
          </span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1 bg-transparent text-[13.5px] font-medium text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none min-w-0"
          />
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Tag"
            className="rounded-full border border-black/[0.08] dark:border-white/[0.1] bg-stone-50 dark:bg-stone-900/70 px-2.5 h-6 text-[11px] font-medium text-stone-600 dark:text-stone-300 w-24 text-center focus:outline-none"
          />
        </div>
      </div>

      {/* Body Textarea */}
      <div className="flex-1 min-h-[240px] flex flex-col overflow-hidden">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your message..."
          className="flex-1 w-full resize-none px-6 py-4 text-[13.5px] text-stone-900 dark:text-[#F3F4F1] placeholder-stone-400 bg-transparent focus:outline-none leading-relaxed overflow-y-auto scrollbar-clean"
        />
      </div>

      {/* Flat Action Footer */}
      <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-t border-black/[0.06] dark:border-white/[0.08] bg-stone-50/70 dark:bg-stone-900/40 shrink-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSaveDraft}
          disabled={isSavingDraft}
          isLoading={isSavingDraft}
        >
          Save Draft
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              playBack();
              handleClose();
            }}
          >
            Discard
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            disabled={isSending}
            isLoading={isSending}
          >
            Send
          </Button>
        </div>
      </div>
    </DynamicIslandModal>
  );
}
