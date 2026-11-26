import { useState } from 'react';
import {
  X,
  Reply,
  Forward,
  Paperclip,
  ArrowRight,
  Clock,
} from 'lucide-react';
import type { InboundEmailItem, CategoryItem } from '../../lib/api';
import { usePlumStore } from '../../store/usePlumStore';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { DynamicIslandModal } from '../ui/DynamicIslandModal';
import { playBack, playEnter } from '../../lib/sound';

interface EmailDetailModalProps {
  email: InboundEmailItem | null;
  categories?: CategoryItem[];
  onClose: () => void;
}

export function EmailDetailModal({ email, categories = [], onClose }: EmailDetailModalProps) {
  const { openComposer } = usePlumStore();
  const [activeTab, setActiveTab] = useState<'formatted' | 'text'>('formatted');

  const getCategoryColor = (cat: string) => {
    const found = categories.find((c) => c.category.toLowerCase() === cat.toLowerCase());
    return found?.color || '#7E36B2';
  };

  const handleReply = (quickDraftPrompt?: string) => {
    if (!email) return;
    playEnter();
    const bodyIntro = `\n\n--- On ${email.parsedDate?.weekday || ''} ${email.parsedDate?.day || ''} ${email.parsedDate?.month || ''} ${email.parsedDate?.year || ''}, ${email.senderName || email.senderEmail} wrote:\n> ${email.snippet || ''}`;
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
    if (!email) return;
    playEnter();
    openComposer({
      subject: email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`,
      body: `\n\n--- Forwarded message ---\nFrom: ${email.senderName || email.senderEmail} <${email.senderEmail}>\nSubject: ${email.subject}\n\n${email.bodyText || email.snippet || ''}`,
    });
    onClose();
  };

  const formattedDate = email?.parsedDate
    ? `${email.parsedDate.weekday}, ${email.parsedDate.day} ${email.parsedDate.month} ${email.parsedDate.year} · ${email.parsedDate.time}`
    : email?.createdAt || '';

  return (
    <DynamicIslandModal
      isOpen={Boolean(email)}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      ariaLabelledBy="email-subject-title"
    >
      {email && (
        <>
          {/* Translucent Header Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-6 min-h-[56px] py-2 border-b border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-[#161714]/80 backdrop-blur-xl shrink-0">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              {email.categories?.map((cat) => (
                <Badge key={cat} customColor={getCategoryColor(cat)} className="shrink-0">
                  {cat}
                </Badge>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {email.bodyHtml && email.bodyText && (
                <div className="flex items-center rounded-lg bg-stone-100 dark:bg-stone-800 p-0.5 text-xs mr-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('formatted')}
                    className={`focus-ring btn-interactive shadow-none rounded-md px-2.5 py-1 text-xs font-medium ${
                      activeTab === 'formatted'
                        ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white'
                        : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                  >
                    Formatted
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('text')}
                    className={`focus-ring btn-interactive shadow-none rounded-md px-2.5 py-1 text-xs font-medium ${
                      activeTab === 'text'
                        ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white'
                        : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                  >
                    Plain
                  </button>
                </div>
              )}

              <Button
                variant="primary"
                size="sm"
                onClick={() => handleReply()}
                icon={<Reply className="h-3.5 w-3.5" />}
              >
                Reply
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleForward}
                icon={<Forward className="h-3.5 w-3.5" />}
              >
                Forward
              </Button>
              <button
                type="button"
                onClick={() => {
                  playBack();
                  onClose();
                }}
                aria-label="Close"
                className="focus-ring btn-interactive shadow-none flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Subject & Sender Metadata */}
          <div className="border-b border-black/[0.06] dark:border-white/[0.08] px-6 py-4 space-y-3 shrink-0">
            <h2
              id="email-subject-title"
              className="text-lg sm:text-xl font-bold tracking-[-0.015em] text-stone-900 dark:text-white leading-snug break-words"
            >
              {email.subject || 'No Subject'}
            </h2>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#B266E6]/10 text-[#7E36B2] dark:text-[#DBBFFF] font-bold text-xs shrink-0">
                  {(email.senderName || email.senderEmail || 'U')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-[13.5px] text-stone-900 dark:text-white truncate">
                    {email.senderName || email.senderEmail}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-500 dark:text-stone-400 break-all">
                    <span className="font-mono">{email.senderEmail}</span>
                    <span>→</span>
                    <span>{email.to || email.email}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500 shrink-0">
                <Clock className="h-3.5 w-3.5" />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5 scrollbar-clean min-w-0">
            {activeTab === 'formatted' && email.bodyHtml ? (
              <div
                className="prose dark:prose-invert max-w-none text-[13.5px] leading-relaxed overflow-x-auto break-words"
                dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
              />
            ) : (
              <div className="whitespace-pre-wrap break-words text-[13.5px] text-stone-800 dark:text-stone-200 leading-relaxed">
                {email.bodyText || email.snippet || 'No email content available.'}
              </div>
            )}

            {email.attachments && email.attachments.length > 0 && (
              <div className="mt-6 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
                  <Paperclip className="h-3.5 w-3.5 text-[#7E36B2] dark:text-[#DBBFFF]" />
                  <span>Attachments ({email.attachments.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {email.attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-stone-50 dark:bg-stone-900/60 px-3 py-1.5 text-xs min-w-0 max-w-full"
                    >
                      <span className="font-medium text-stone-800 dark:text-stone-200 truncate max-w-[200px]">
                        {att.filename || 'Attachment'}
                      </span>
                      {att.size && (
                        <span className="text-[11px] text-stone-400 font-mono shrink-0">
                          {Math.round(att.size / 1024)} KB
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Flat Quick Reply Footer */}
          <div className="border-t border-black/[0.06] dark:border-white/[0.08] px-6 py-3 bg-stone-50/70 dark:bg-stone-900/40 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button variant="secondary" size="sm" onClick={() => handleReply('confirm')}>
                Confirm
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleReply('details')}>
                Request details
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleReply('decline')}>
                Decline
              </Button>
            </div>

            <button
              type="button"
              onClick={() => handleReply()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#7E36B2] dark:text-[#DBBFFF] hover:underline"
            >
              <span>Open Composer</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </DynamicIslandModal>
  );
}
