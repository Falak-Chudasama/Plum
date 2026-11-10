import { useState } from 'react';
import {
  X,
  Reply,
  Forward,
  Paperclip,
  Calendar,
  User,
  Tag,
  ExternalLink,
  Sparkles,
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

  const handleReply = () => {
    openComposer({
      to: [email.senderEmail],
      subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
      body: `\n\n--- On ${email.parsedDate?.weekday || ''} ${email.parsedDate?.day || ''} ${email.parsedDate?.month || ''} ${email.parsedDate?.year || ''}, ${email.senderName || email.senderEmail} wrote:\n> ${email.snippet || ''}`,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex flex-col w-full max-w-3xl max-h-[92vh] rounded-3xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#181915] shadow-lift overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] px-6 py-4 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-display text-base font-bold text-stone-900 dark:text-white truncate">
              {email.subject || 'No Subject'}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleReply}
              className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-stone-800 px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
            >
              <Reply className="h-3.5 w-3.5 text-[#B266E6]" />
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
              className="rounded-lg p-1 text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Sender & Metadata bar */}
        <div className="border-b border-black/[0.05] dark:border-white/[0.06] px-6 py-3.5 bg-black/[0.01] dark:bg-white/[0.01] space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#B266E6]/15 text-[#5C207E] dark:text-[#DBBFFF] font-bold text-xs">
                {(email.senderName || email.senderEmail || 'U')[0].toUpperCase()}
              </div>
              <div>
                <div className="text-xs font-bold text-stone-900 dark:text-white">
                  {email.senderName || email.senderEmail}
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400">
                  {email.senderEmail}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {email.parsedDate?.weekday} {email.parsedDate?.day} {email.parsedDate?.month} {email.parsedDate?.year} • {email.parsedDate?.time}
              </span>
            </div>
          </div>

          {/* Categories & To */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
            <div className="text-stone-500 dark:text-stone-400">
              <span className="font-semibold">To:</span> {email.to || email.email}
            </div>
            {email.categories && email.categories.length > 0 && (
              <div className="flex items-center gap-1.5">
                {email.categories.map((cat) => {
                  const meta = getCategoryMeta(cat);
                  return (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold shadow-2xs"
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
        </div>

        {/* View Toggle */}
        {email.bodyHtml && email.bodyText && (
          <div className="flex items-center gap-2 px-6 pt-3 border-b border-black/[0.05] dark:border-white/[0.06] pb-2 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('formatted')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                activeTab === 'formatted'
                  ? 'bg-black/[0.06] dark:bg-white/[0.08] text-stone-900 dark:text-white'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              Formatted View
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                activeTab === 'text'
                  ? 'bg-black/[0.06] dark:bg-white/[0.08] text-stone-900 dark:text-white'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              Plain Text
            </button>
          </div>
        )}

        {/* Email Body Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-clean">
          {activeTab === 'formatted' && email.bodyHtml ? (
            <div
              className="prose dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
            />
          ) : (
            <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed">
              {email.bodyText || email.snippet || 'No email content available.'}
            </div>
          )}

          {/* Attachments Section */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="mt-6 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300 mb-2">
                <Paperclip className="h-3.5 w-3.5 text-[#B266E6]" />
                <span>Attachments ({email.attachments.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {email.attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.03] px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-stone-800 dark:text-stone-200 truncate max-w-[180px]">
                      {att.filename || 'Attachment'}
                    </span>
                    {att.size && (
                      <span className="text-[10px] text-stone-400">
                        {Math.round(att.size / 1024)} KB
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
