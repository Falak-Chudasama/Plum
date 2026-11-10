import { useState, useEffect } from 'react';
import { Send, Calendar, Search, Tag, ChevronLeft, ChevronRight, PenSquare } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { usePlumStore } from '../store/usePlumStore';
import { api } from '../lib/api';
import type { OutboundEmailItem } from '../lib/api';

export function SentPage() {
  const { activeMailbox, openComposer } = usePlumStore();
  const [emails, setEmails] = useState<OutboundEmailItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const today = new Date();
  const [selectedDate, setSelectedDate] = useState({
    day: today.getDate(),
    month: today.toLocaleString('default', { month: 'short' }),
    year: today.getFullYear(),
  });

  useEffect(() => {
    let isCancelled = false;

    async function loadSent() {
      if (!activeMailbox) return;
      setIsLoading(true);
      try {
        const data = await api.fetchOutboundEmailsByDate(
          selectedDate.day,
          selectedDate.month,
          selectedDate.year,
          activeMailbox
        );
        if (!isCancelled) {
          setEmails(data.filter((e) => e.status === 'sent'));
        }
      } catch (err) {
        console.error('Error fetching sent emails:', err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadSent();
    return () => {
      isCancelled = true;
    };
  }, [activeMailbox, selectedDate]);

  const filtered = emails.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesSubject = item.subject?.toLowerCase().includes(q);
    const matchesTo = item.to?.some((t) => t.toLowerCase().includes(q));
    const matchesBody = item.body?.toLowerCase().includes(q);
    return matchesSubject || matchesTo || matchesBody;
  });

  return (
    <PageShell
      title="Sent Messages"
      subtitle={`Sent from: ${activeMailbox || 'No account selected'}`}
      action={
        <button
          type="button"
          onClick={() => openComposer()}
          className="focus-ring inline-flex items-center gap-1.5 rounded-2xl bg-[#B266E6] hover:bg-[#8F40C7] text-white px-4 py-2 text-xs font-semibold shadow-soft transition"
        >
          <PenSquare className="h-3.5 w-3.5" />
          <span>New Message</span>
        </button>
      }
    >
      <div className="space-y-4">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sent messages..."
              className="w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#181915] pl-9 pr-4 py-2 text-xs text-stone-900 dark:text-white placeholder-stone-400 shadow-soft focus-ring"
            />
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#181915] px-3 py-1.5 shadow-soft text-xs">
            <Calendar className="h-3.5 w-3.5 text-[#B266E6]" />
            <span className="font-semibold text-stone-700 dark:text-stone-200">
              {selectedDate.month} {selectedDate.day}, {selectedDate.year}
            </span>
            <div className="flex items-center gap-1 ml-1 border-l border-black/[0.06] dark:border-white/[0.08] pl-2">
              <button
                type="button"
                onClick={() => {
                  const d = new Date(selectedDate.year, today.getMonth(), selectedDate.day - 1);
                  setSelectedDate({
                    day: d.getDate(),
                    month: d.toLocaleString('default', { month: 'short' }),
                    year: d.getFullYear(),
                  });
                }}
                className="rounded p-1 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(selectedDate.year, today.getMonth(), selectedDate.day + 1);
                  setSelectedDate({
                    day: d.getDate(),
                    month: d.toLocaleString('default', { month: 'short' }),
                    year: d.getFullYear(),
                  });
                }}
                className="rounded p-1 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Sent Emails List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded-2xl border border-black/[0.05] dark:border-white/[0.06] bg-white/60 dark:bg-[#181915]/60 animate-pulse p-4"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#181915] p-12 text-center shadow-soft">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#89D66D]/15 text-[#2E7D32] dark:text-[#89D66D]">
              <Send className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-stone-900 dark:text-white">
              No sent messages
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-stone-500 dark:text-stone-400">
              No emails were dispatched on this date from {activeMailbox}.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#181915] shadow-soft divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
            {filtered.map((item, idx) => (
              <div
                key={item._id || idx}
                onClick={() =>
                  openComposer({
                    to: item.to,
                    subject: `Follow-up: ${item.subject}`,
                    body: `\n\n--- Previous message sent on ${item.sentAt || ''} ---\n${item.body}`,
                  })
                }
                className="group flex items-start gap-3.5 p-4 sm:px-5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer transition"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#89D66D]/15 text-[#2E7D32] dark:text-[#89D66D] font-bold text-xs mt-0.5">
                  <Send className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-stone-900 dark:text-white truncate">
                      To: {item.to.join(', ')}
                    </span>
                    <span className="text-[11px] text-stone-400">
                      {item.sentAt ? new Date(item.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate mt-0.5">
                    {item.subject}
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                    {item.body}
                  </p>
                  {item.category && (
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#B266E6]/10 px-2 py-0.5 text-[10px] font-semibold text-[#5C207E] dark:text-[#DBBFFF]">
                        <Tag className="h-2.5 w-2.5" />
                        {item.category}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
