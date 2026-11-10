import { useState } from 'react';
import {
  X,
  Reply,
  Forward,
  Paperclip,
  Calendar,
  User,
  Tag,
  Sparkles,
  CheckCircle2,
  Inbox,
  ArrowRight,
  Clock,
  Send,
} from 'lucide-react';
import type { InboundEmailItem, CategoryItem } from '../../lib/api';
import { usePlumStore } from '../../store/usePlumStore';

interface EmailDetailModalProps {
  email: InboundEmailItem | null;
  categories?: CategoryItem[];
  onClose: () => void;
}

export function EmailDetailModal({ email, categories = [], onClose }: EmailDetailModalProps) {
  const { openComposer } = usePlumStore();
  const [activeTab, setActiveTab] = useState<'formatted' | 'text'>('formatted');

  if (!email) return null;

  const getCategoryMeta = (cat: string) => {
    const found = categories.find((c) => c.category.toLowerCase() === cat.toLowerCase());
    const color = found?.color || '#B266E6';
    return {
      bg: `${color}18`,
      text: color,
      border: `${color}40`,
    };
  };

  const handleReply = (quickDraftPrompt?: string) => {
    let bodyIntro = `\n\n--- On ${email.parsedDate?.weekday || ''} ${email.parsedDate?.day || ''} ${email.parsedDate?.month || ''} ${email.parsedDate?.year || ''}, ${email.senderName || email.senderEmail} wrote:\n> ${email.snippet || ''}`;
    let prefill = '';
    if (quickDraftPrompt === 'confirm') {
      prefill = `Hi ${email.senderName || 'there'},\n\nThank you for reaching out. I confirm receipt and will review this shortly.\n\nBest regards,`;
    } else if (quickDraftPrompt === 'details') {
      prefill = `Hi ${email.senderName || 'there'},\n\nThank you for your email. Could you provide a bit more detail regarding this?\n\nBest regards,`;
    } else if (quickDraftPrompt === 'decline') {
      prefill = `Hi ${email.senderName || 'there'},\n\nThank you for the opportunity. Unfortunately, I am unable to proceed with this at this time.\n\nBest regards,`;
    }

    openComposer({
      to: [email.senderEmail],
      subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
      body: prefill ? `${prefill}${bodyIntro}` : bodyIntro,
    });
    onClose();
  };

  const handleForward = () => {
    openComposer({
      subject: email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`,
      body: `\n\n--- Forwarded message ---\nFrom: ${email.senderName || email.senderEmail} <${email.senderEmail}>\nSubject: ${email.subject}\n\n${email.bodyText || email.snippet || ''}`,
    });
    onClose();
  };

  const formattedDate = email.parsedDate
    ? `${email.parsedDate.weekday}, ${email.parsedDate.day} ${email.parsedDate.month} ${email.parsedDate.year} at ${email.parsedDate.time}`
    : 'Recent date';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/45 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-3xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#181915] shadow-lift overflow-hidden font-sans"
      >
        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] px-6 py-3.5 bg-stone-50/60 dark:bg-stone-900/40">
          {/* Categories Pill Strip */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
              <Inbox className="h-3 w-3" />
              Inbound
            </span>
            {email.categories && email.categories.length > 0 && (
              <div className="flex items-center gap-1.5 ml-2">
                {email.categories.map((cat) => {
                  const meta = getCategoryMeta(cat);
                  return (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold shadow-2xs"
                      style={{
                        backgroundColor: meta.bg,
                        color: meta.text,
                        borderColor: meta.border,
                      }}
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {cat}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {email.bodyHtml && email.bodyText && (
              <div className="flex items-center rounded-xl bg-black/[0.04] dark:bg-white/[0.06] p-0.5 text-xs mr-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('formatted')}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                    activeTab === 'formatted'
                      ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                  }`}
                >
                  Formatted
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('text')}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                    activeTab === 'text'
                      ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                  }`}
                >
                  Raw Text
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleReply()}
              className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-[#B266E6] hover:bg-[#8F40C7] text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition"
            >
              <Reply className="h-3.5 w-3.5" />
              <span>Reply</span>
            </button>
            <button
              type="button"
              onClick={handleForward}
              className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-stone-800 px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
            >
              <Forward className="h-3.5 w-3.5 text-[#89D66D]" />
              <span>Forward</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Email Header & Sender Card */}
        <div className="border-b border-black/[0.06] dark:border-white/[0.08] px-6 sm:px-8 py-5 space-y-4 bg-white dark:bg-[#181915]">
          {/* Email Subject Title (Host Grotesk font, NO Unbounded) */}
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-white font-sans leading-snug">
            {email.subject || 'No Subject'}
          </h1>

          {/* Sender & Recipient Information Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-black/[0.05] dark:border-white/[0.07] bg-stone-50/70 dark:bg-stone-900/40 p-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Sender Avatar */}
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#B266E6]/10 text-[#5C207E] dark:text-[#DBBFFF] font-bold text-sm shrink-0 border border-black/[0.05] dark:border-white/[0.06]">
                {(email.senderName || email.senderEmail || 'U')[0].toUpperCase()}
              </div>

              {/* Sender details */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-stone-900 dark:text-white truncate">
                    {email.senderName || email.senderEmail}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Verified Sender
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  <span className="font-mono">{email.senderEmail}</span>
                  <span>•</span>
                  <span>
                    To: <strong className="font-semibold text-stone-700 dark:text-stone-300">{email.to || email.email}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Timestamp Badge */}
            <div className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500 shrink-0 font-medium">
              <Clock className="h-3.5 w-3.5 text-stone-400" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Email Body Content Container */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 scrollbar-clean">
          {activeTab === 'formatted' && email.bodyHtml ? (
            <div
              className="prose dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed overflow-x-auto font-sans"
              dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
            />
          ) : (
            <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed font-normal">
              {email.bodyText || email.snippet || 'No email content available.'}
            </div>
          )}

          {/* Attachments Section */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="mt-8 pt-5 border-t border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300 mb-2.5">
                <Paperclip className="h-4 w-4 text-[#B266E6]" />
                <span>Attachments ({email.attachments.length})</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {email.attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.03] px-3.5 py-2 text-xs hover:border-[#B266E6]/40 transition"
                  >
                    <span className="font-medium text-stone-800 dark:text-stone-200 truncate max-w-[200px]">
                      {att.filename || 'Attachment'}
                    </span>
                    {att.size && (
                      <span className="text-[10px] text-stone-400 font-mono">
                        {Math.round(att.size / 1024)} KB
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick AI Response Footer Dock */}
        <div className="border-t border-black/[0.06] dark:border-white/[0.08] px-6 py-3.5 bg-stone-50/60 dark:bg-stone-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-bold text-[#5C207E] dark:text-[#DBBFFF]">
              <Sparkles className="h-3 w-3 text-[#B266E6]" />
              Quick AI Reply:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleReply('confirm')}
                className="rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-stone-800 px-3 py-1 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-[#B266E6]/10 hover:border-[#B266E6]/30 hover:text-[#5C207E] dark:hover:text-[#DBBFFF] transition shadow-2xs"
              >
                Acknowledge & Confirm
              </button>
              <button
                type="button"
                onClick={() => handleReply('details')}
                className="rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-stone-800 px-3 py-1 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-[#B266E6]/10 hover:border-[#B266E6]/30 hover:text-[#5C207E] dark:hover:text-[#DBBFFF] transition shadow-2xs"
              >
                Request Details
              </button>
              <button
                type="button"
                onClick={() => handleReply('decline')}
                className="rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-stone-800 px-3 py-1 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-600 transition shadow-2xs"
              >
                Politely Decline
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleReply()}
            className="self-end sm:self-auto inline-flex items-center gap-1.5 text-xs font-bold text-[#5C207E] dark:text-[#DBBFFF] hover:underline"
          >
            <span>Open Full Composer</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
